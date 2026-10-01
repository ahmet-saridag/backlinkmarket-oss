"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation/account";
import { fieldErrors } from "@/lib/validation/account";
import { roundCents } from "@/lib/labels";
import { expectedLinks, isPermanent, needsUrl } from "@/lib/expected-links";
import { checkOfferLinks } from "@/lib/offer-links";
import { appSecret } from "@/lib/app-secret";
import { suspensionMessage } from "@/lib/standing-data";
import { offerLimits, platformLimits } from "@/lib/market-rules";
import type { OfferBriefLine, SiteCategoryConfig } from "@/lib/types";
import { deliverLinkSchema, sendExchangeSchema, sendOfferSchema, swapWithdrawReasons, withdrawReasons, type BriefLineInput } from "@/lib/validation/offer";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const NOT_SIGNED_IN: ActionResult = { ok: false, error: "You're signed out. Sign in again and retry." };
const GENERIC: ActionResult = { ok: false, error: "Something went wrong. Please try again." };
const NOT_FOUND: ActionResult = { ok: false, error: "Offer not found." };

function done(offerId: string): ActionResult {
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/backlinks");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** The 72 hours of a waiting stage are over (the system closes the offer within minutes, but nothing may move it in between). */
const pastDeadline = (offer: { deadline_at?: string | null }) => !!offer.deadline_at && Date.parse(offer.deadline_at) <= Date.now();
const OVERDUE = { ok: false as const, error: "The 72 hours for this step have run out — the offer is being closed." };

async function appendTimeline(supabase: SupabaseClient, offerId: string, status: string, patch: Record<string, unknown> = {}) {
  const { data: row } = await supabase.from("offers").select("timeline").eq("id", offerId).single();
  const timeline = Array.isArray(row?.timeline) ? row.timeline : [];
  return supabase
    .from("offers")
    .update({ ...patch, status, timeline: [...timeline, { status, at: new Date().toISOString() }] })
    .eq("id", offerId);
}

/** The other offers of the same swap (exchange: the link back), so accept/decline/cancel move together. */
async function partnerIds(supabase: SupabaseClient, offer: { id: string; type: string; pair_id: string | null }) {
  if (offer.type !== "exchange" || !offer.pair_id) return [];
  const { data } = await supabase.from("offers").select("id").eq("pair_id", offer.pair_id).neq("id", offer.id);
  return (data ?? []).map((r) => r.id as string);
}

async function moveTogether(supabase: SupabaseClient, offer: { id: string; type: string; pair_id: string | null }, status: string) {
  const first = await appendTimeline(supabase, offer.id, status);
  if (first.error) return first;
  for (const id of await partnerIds(supabase, offer)) {
    const r = await appendTimeline(supabase, id, status);
    if (r.error) return r;
  }
  return first;
}

/** Same rules the wizard enforces per category, re-checked here. */
function briefProblem(line: BriefLineInput, sellerDomain: string): string | null {
  const http = (v?: string) => !!v && /^https?:\/\//.test(v);
  if (line.category === "review") return line.productInfo?.trim() && line.accessDetails?.trim() ? null : "Fill in the review brief.";
  if (line.category === "link_insertion") {
    if (!line.sellerPage) return "Pick the page for the Link Insertion.";
    try {
      const host = new URL(line.sellerPage).hostname.replace(/^www\./, "");
      if (host !== sellerDomain.replace(/^www\./, "")) return "The page must be on the seller's site.";
    } catch {
      return "Enter a full page URL on the seller's site.";
    }
  }
  return http(line.targetUrl) && line.anchor?.trim() ? null : "Every category needs a target URL and an anchor.";
}

/**
 * A buyer sends a Paid Market offer for their own site to get a link from a seller's site.
 * Both sites must be real, active and owned by different accounts, the seller's site must be
 * listed in Paid Market, and the price comes from the seller's listing — never from the client.
 */
export async function sendOffer(input: unknown): Promise<ActionResult & { offerId?: string; offerRef?: string }> {
  const parsed = sendOfferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { type, buyerSiteId, sellerSiteId, lines } = parsed.data;
  const suspended = await suspensionMessage(supabase, userId);
  if (suspended) return { ok: false, error: suspended };

  if (new Set(lines.map((l) => l.category)).size !== lines.length) return { ok: false, error: "Each category can only be added once." };

  const [{ data: buyerSite }, { data: sellerSite }] = await Promise.all([
    supabase.from("sites").select("id, user_id, status, domain, dr").eq("id", buyerSiteId).is("archived_at", null).maybeSingle(),
    supabase.from("sites").select("id, user_id, status, markets, categories, domain, dr").eq("id", sellerSiteId).is("archived_at", null).maybeSingle(),
  ]);
  if (!buyerSite || buyerSite.user_id !== userId) return { ok: false, error: "Pick one of your own sites." };
  if (buyerSite.status !== "active") return { ok: false, error: "Your site must be active to send offers." };
  if (!sellerSite || sellerSite.status !== "active") return { ok: false, error: "That listing is no longer available." };
  if (sellerSite.user_id === userId) return { ok: false, error: "You can't send an offer to your own site." };
  if (!sellerSite.markets.includes(type)) return { ok: false, error: "That site isn't listed in this market anymore." };
  for (const line of lines) {
    const problem = briefProblem(line, sellerSite.domain);
    if (problem) return { ok: false, error: problem };
  }

  const { count: openCount } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", userId)
    .in("status", ["SENT", "ACCEPTED", "PAYMENT_RECEIVED", "DELIVERED"]);
  if ((openCount ?? 0) >= offerLimits.max) return { ok: false, error: `You can have at most ${offerLimits.max} open offers at once.` };
  const { data: sentToday } = await supabase.rpc("offers_sent_24h");
  if ((sentToday ?? 0) >= offerLimits.perDay) return { ok: false, error: `You can send at most ${offerLimits.perDay} offers per 24 hours. Try again later.` };

  const { data: existing } = await supabase
    .from("offers")
    .select("id")
    .eq("buyer_site_id", buyerSiteId)
    .eq("seller_site_id", sellerSiteId)
    .in("status", ["SENT", "ACCEPTED", "PAYMENT_RECEIVED", "DELIVERED"])
    .limit(1);
  if (existing?.length) return { ok: false, error: "You already have an open offer for this site." };

  // Price it from the seller's real listing.
  const configs = (Array.isArray(sellerSite.categories) ? sellerSite.categories : []) as SiteCategoryConfig[];
  let total = 0;
  const brief = [];
  for (const line of lines) {
    const cfg = configs.find((c) => c.category === line.category);
    if (!cfg) return { ok: false, error: "One of those categories isn't sold on this site anymore." };
    const net = roundCents(cfg.price * (1 - cfg.discountPct / 100));
    const extraFee = roundCents(line.extras.length * cfg.dofollowFee);
    total = roundCents(total + net + extraFee);
    brief.push({ ...line, duration: cfg.duration, price: cfg.price, discountPct: cfg.discountPct, net, extraFee, total: roundCents(net + extraFee) });
  }
  if (total < platformLimits.minTotal || total > platformLimits.maxTotal) {
    return { ok: false, error: `The total must be between $${platformLimits.minTotal} and $${platformLimits.maxTotal}.` };
  }

  const first = lines.find((l) => l.category !== "review" && l.targetUrl && l.anchor);
  const { data: created, error } = await supabase.rpc("app_create_paid_offer", {
    p_secret: appSecret(),
    p_row: {
      buyer_user_id: userId,
      buyer_site_id: buyerSiteId,
      seller_user_id: sellerSite.user_id,
      seller_site_id: sellerSiteId,
      buyer_domain: buyerSite.domain,
      seller_domain: sellerSite.domain,
      buyer_dr: buyerSite.dr,
      seller_dr: sellerSite.dr,
      categories: lines.map((l) => l.category),
      anchor: first?.anchor ?? buyerSite.domain,
      target_url: first?.targetUrl ?? `https://${buyerSite.domain}`,
      amount: total,
      brief,
      message: parsed.data.message || "",
    },
  });
  const row = (created as { id: string; ref: string }[] | null)?.[0];
  if (error?.message?.includes("daily_offer_limit")) return { ok: false, error: `You can send at most ${offerLimits.perDay} offers per 24 hours. Try again later.` };
  if (error?.message?.includes("account_suspended")) return { ok: false, error: "Your account is banned: you can't start new offers." };
  if (error || !row) return GENERIC;
  revalidatePath("/offers");
  return { ok: true, offerId: row.id, offerRef: row.ref };
}

/** Seller accepts a SENT offer. */
export async function acceptOffer(offerId: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase.from("offers").select("id, type, status, seller_user_id, pair_id, deadline_at").eq("id", offerId).maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.seller_user_id !== userId) return { ok: false, error: "Only the seller can accept this offer." };
  if (offer.type === "abc") return { ok: false, error: "ABC rooms don't need accepting." };
  if (offer.type === "exchange" && offer.id !== offer.pair_id) return { ok: false, error: "Accept the swap from the offer sent to you." };
  if (offer.status !== "SENT") return { ok: false, error: "This offer already moved on." };
  if (pastDeadline(offer)) return OVERDUE;
  if (offer.type === "paid") {
    // The buyer pays you directly, so they need your payout details before you accept.
    const { data: payout } = await supabase.from("payout_accounts").select("user_id").eq("user_id", userId).maybeSingle();
    if (!payout) return { ok: false, error: "Add your payout account in Account first — the buyer needs it to pay you." };
  }
  const { error } = await moveTogether(supabase, offer, "ACCEPTED");
  return error ? GENERIC : done(offerId);
}

/** Seller declines a SENT offer. */
export async function rejectOffer(offerId: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase.from("offers").select("id, type, status, seller_user_id, pair_id").eq("id", offerId).maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.seller_user_id !== userId) return { ok: false, error: "Only the seller can decline this offer." };
  if (offer.status !== "SENT") return { ok: false, error: "This offer already moved on." };
  const { error } = await moveTogether(supabase, offer, "REJECTED");
  return error ? GENERIC : done(offerId);
}

/** Buyer cancels a SENT offer, only once the 1-hour cooldown has passed. */
export async function cancelOffer(offerId: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase
    .from("offers")
    .select("id, type, status, buyer_user_id, cooldown_until, pair_id")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.buyer_user_id !== userId) return { ok: false, error: "Only the buyer can cancel this offer." };
  if (offer.status !== "SENT") return { ok: false, error: "This offer already moved on." };
  if (new Date(offer.cooldown_until) > new Date()) return { ok: false, error: "You can cancel once the 1-hour cooldown passes." };
  const { error } = await moveTogether(supabase, offer, "CANCELLED");
  return error ? GENERIC : done(offerId);
}

/**
 * Paid Market: the buyer says they've sent the payment — and must show it. The proof (a bank transfer receipt, an IBAN
 * transfer confirmation, a crypto transaction screenshot) is uploaded first, from the buyer's browser, into a private
 * place only the two sides can open; this step checks it is really there and then tells the seller.
 */
export async function markPaymentSent(offerId: string, proofPath: string, reference?: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase.from("offers").select("id, type, status, buyer_user_id, payment_sent_at, deadline_at").eq("id", offerId).maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.type !== "paid") return { ok: false, error: "Only Paid Market offers have a payment." };
  if (offer.buyer_user_id !== userId) return { ok: false, error: "Only the buyer can say they've paid." };
  if (offer.status !== "ACCEPTED") return { ok: false, error: "This offer already moved on." };
  if (offer.payment_sent_at) return { ok: true };
  if (pastDeadline(offer)) return OVERDUE;
  if (!proofPath.startsWith(`${offerId}/`) || proofPath.includes("..")) return { ok: false, error: "Upload the proof of your payment first." };
  const folder = await supabase.storage.from("payment-proofs").list(offerId, { limit: 100 });
  if (!folder.data?.some((f) => `${offerId}/${f.name}` === proofPath)) return { ok: false, error: "We couldn't find the proof you uploaded — try again." };
  const note = (reference ?? "").trim().slice(0, 200);
  const { error } = await supabase.from("offers").update({ payment_sent_at: new Date().toISOString(), payment_proof_path: proofPath, payment_reference: note || null }).eq("id", offerId);
  return error ? GENERIC : done(offerId);
}

/** Paid Market: the seller says the money didn't reach them. The offer is closed — nobody is penalised, the proof stays on record. */
export async function reportPaymentNotReceived(offerId: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase.from("offers").select("id, type, status, seller_user_id, payment_sent_at").eq("id", offerId).maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.type !== "paid" || offer.seller_user_id !== userId) return { ok: false, error: "Only the seller can say this." };
  if (offer.status !== "ACCEPTED" || !offer.payment_sent_at) return { ok: false, error: "There's no payment claim to answer." };
  const { error } = await appendTimeline(supabase, offerId, "CANCELLED", { cancel_reason: "The seller says the payment did not arrive.", cancelled_by: userId });
  return error ? GENERIC : done(offerId);
}

/**
 * Backing out after an offer was accepted. Paid: the buyer, only while they haven't said they've paid.
 * Exchange: either side, only while both links are still to be placed (the whole swap is withdrawn).
 * ABC: no — the other two sites in the pool depend on you.
 */
export async function withdrawAcceptedOffer(offerId: string, reason: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase
    .from("offers")
    .select("id, type, status, buyer_user_id, seller_user_id, payment_sent_at, pair_id")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.status !== "ACCEPTED") return { ok: false, error: "This offer already moved on." };

  if (offer.type === "paid") {
    if (!withdrawReasons.includes(reason)) return { ok: false, error: "Pick a reason." };
    if (offer.buyer_user_id !== userId) return { ok: false, error: "Only the buyer can withdraw this offer." };
    if (offer.payment_sent_at) return { ok: false, error: "You've told them you paid — ask them to sort it out with you before withdrawing." };
    const { error } = await appendTimeline(supabase, offerId, "CANCELLED", { cancel_reason: reason, cancelled_by: userId });
    return error ? GENERIC : done(offerId);
  }

  if (offer.type === "exchange") {
    if (!swapWithdrawReasons.includes(reason)) return { ok: false, error: "Pick a reason." };
    if (offer.buyer_user_id !== userId && offer.seller_user_id !== userId) return NOT_FOUND;
    const ids = [offer.id, ...(await partnerIds(supabase, offer))];
    const { data: rows } = await supabase.from("offers").select("id, status").in("id", ids);
    if ((rows ?? []).some((r) => r.status !== "ACCEPTED")) return { ok: false, error: "One of the links is already live — a swap can't be withdrawn now." };
    for (const id of ids) {
      const { error } = await appendTimeline(supabase, id, "CANCELLED", { cancel_reason: reason, cancelled_by: userId });
      if (error) return GENERIC;
    }
    return done(offerId);
  }

  return { ok: false, error: "A pool can't be left once it has locked — the other two sites are counting on you." };
}

/** Paid Market only: the seller confirms the buyer's direct payment actually landed. */
export async function confirmPaymentReceived(offerId: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase.from("offers").select("id, type, status, seller_user_id, amount, payment_sent_at, deadline_at").eq("id", offerId).maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.type !== "paid") return { ok: false, error: "Only Paid Market offers go through this step." };
  if (offer.seller_user_id !== userId) return { ok: false, error: "Only the seller can confirm this." };
  if (offer.status !== "ACCEPTED") return { ok: false, error: "This offer already moved on." };
  // Only after the buyer says they've paid — confirming money that nobody has claimed to send makes no sense
  if (!offer.payment_sent_at) return { ok: false, error: "The buyer hasn't said they've paid yet." };
  if (pastDeadline(offer)) return OVERDUE;
  // The payments row is written by a database trigger (public.record_offer_payment), not here —
  // payments stay backend-authored, never something an authenticated client can insert directly.
  const { error } = await appendTimeline(supabase, offerId, "PAYMENT_RECEIVED");
  return error ? GENERIC : done(offerId);
}

/**
 * The seller says the link(s) are placed. The offer moves to "checking" at once (both sides see it), and right
 * after the response we open the page(s) ourselves and check every ordered link — and every extra dofollow link.
 * All there → the offer goes live and the buyer is told. Something missing → it goes back to waiting for the seller,
 * with exactly what we saw where, and they press the button again once it's fixed. That repeats until it is right.
 * Paid: the seller, once the payment is confirmed. Exchange/ABC: the host of that link, once accepted.
 * A URL is only asked for where we can't know it (a guest post, a review, an ABC page nobody picked).
 */
export async function deliverLink(input: unknown): Promise<ActionResult & { checking?: boolean }> {
  const parsed = deliverLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { offerId, urls } = parsed.data;

  const { data: offer } = await supabase
    .from("offers")
    .select("id, type, status, seller_user_id, seller_domain, buyer_domain, brief, timeline, delivery_check, deadline_at")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return NOT_FOUND;
  // The seller hosts the link on every market; on Exchange/ABC each link is its own offer.
  if (offer.seller_user_id !== userId) return { ok: false, error: "You're not the one placing this link." };
  const waitingStatus = offer.type === "paid" ? "PAYMENT_RECEIVED" : "ACCEPTED";
  const prior = (offer.delivery_check ?? null) as { attempt?: number; startedAt?: string } | null;
  // A check that never came back (the server was interrupted) can be started again after a few minutes
  const stuck = offer.status === "DELIVERED" && !!prior?.startedAt && Date.now() - Date.parse(prior.startedAt) > 3 * 60_000;
  if (offer.status === "DELIVERED" && !stuck) return { ok: false, error: "We're already checking your page — give it a moment." };
  if (offer.status !== waitingStatus && !stuck) return { ok: false, error: "This offer already moved on." };
  if (pastDeadline(offer)) return OVERDUE;

  const brief = (offer.brief ?? []) as OfferBriefLine[];
  const deliveries: Record<string, string> = {};
  const missing: Record<string, string> = {};
  for (const line of brief) {
    if (!needsUrl(line, offer.seller_domain)) continue;
    const url = urls[line.category]?.trim();
    if (!url) {
      missing[line.category] = "Enter the page where you placed it.";
      continue;
    }
    if (hostOf(url) !== offer.seller_domain.toLowerCase().replace(/^www\./, "")) {
      missing[line.category] = `The page must be on ${offer.seller_domain}.`;
      continue;
    }
    deliveries[line.category] = url;
  }
  if (Object.keys(missing).length) return { ok: false, fieldErrors: missing };

  const attempt = (prior?.attempt ?? 0) + 1;
  const startedAt = new Date().toISOString();
  const firstUrl = Object.values(deliveries)[0] ?? expectedLinks(brief, offer.seller_domain, offer.buyer_domain, deliveries)[0]?.pageUrl ?? null;
  const { data: moved, error } = await supabase
    .from("offers")
    .update({ status: "DELIVERED", deliveries, delivered_url: firstUrl, delivery_check: { attempt, startedAt, ok: null, problems: [] } })
    .eq("id", offerId)
    .in("status", [waitingStatus, "DELIVERED"])
    .select("id");
  if (error) return GENERIC;
  if (!moved?.length) return { ok: false, error: "This offer already moved on." };

  // Look at the page(s) once the response has gone out: the seller sees "checking" straight away.
  after(async () => {
    let check: Awaited<ReturnType<typeof checkOfferLinks>>;
    try {
      check = await checkOfferLinks({ brief, sellerDomain: offer.seller_domain, buyerDomain: offer.buyer_domain, deliveries });
    } catch {
      check = {
        ok: false,
        status: { live: false, dofollow: false, anchorMatches: false, lastScan: new Date().toISOString() },
        problems: [{ label: "Your page", reason: "We couldn't check it just now — press the button again in a minute." }],
        discovered: {},
        outcome: "unreachable",
      };
    }
    // The result is written by the database function only our server can call: nobody can mark their own link live
    await supabase.rpc("app_apply_delivery", {
      p_secret: appSecret(),
      p_id: offerId,
      p_ok: check.ok,
      p_link_status: check.status,
      p_problems: check.problems,
      p_attempt: attempt,
      p_started: startedAt,
      p_discovered: check.discovered,
      // A permanent placement ("forever") is complete right away — the link is still checked daily afterwards;
      // a timed one stays in monitoring until its term ends.
      p_permanent: isPermanent(brief),
    });
  });

  return { ...done(offerId), checking: true };
}

/**
 * Re-scan a live link. Still fine → refresh the scan time. Gone or changed → the offer moves to
 * ANOMALY_CHECK with a 7-day window to put it back; if the link is back, it returns to monitoring.
 */
export async function rescanLink(offerId: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: offer } = await supabase
    .from("offers")
    .select("id, status, buyer_user_id, seller_user_id, seller_domain, buyer_domain, brief, deliveries, anomaly")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return NOT_FOUND;
  if (offer.buyer_user_id !== userId && offer.seller_user_id !== userId) return NOT_FOUND;
  if (!["ACTIVE_MONITORING", "ANOMALY_CHECK", "COMPLETED"].includes(offer.status)) return { ok: false, error: "This offer has no live link to scan." };

  const result = await checkOfferLinks({
    brief: (offer.brief ?? []) as OfferBriefLine[],
    sellerDomain: offer.seller_domain,
    buyerDomain: offer.buyer_domain,
    deliveries: (offer.deliveries ?? {}) as Record<string, string>,
  });
  // A page we couldn't open is nobody's fault: nothing changes
  if (result.outcome === "unreachable") return { ok: false, error: "We couldn't reach the page just now — nothing was changed. Try again in a few minutes." };
  // The result is stored by the function only our server can call. A link that is fine again brings an offer back from
  // its warning; a link that is gone is only shown here — whether it has really gone is the daily monitor's decision
  // (it looks twice, then opens the 7-day window), so pressing this button never starts that clock.
  const { error } = await supabase.rpc("app_apply_rescan", { p_secret: appSecret(), p_id: offerId, p_ok: result.ok, p_link_status: result.status, p_discovered: result.discovered });
  if (error) return GENERIC;
  revalidatePath(`/offers/${offerId}`);
  return result.ok ? done(offerId) : { ok: false, error: result.problems[0]?.reason ?? "The link is missing or changed." };
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
const onSite = (url: string, domain: string) => hostOf(url) === domain.toLowerCase().replace(/^www\./, "");

/**
 * Exchange: a 1:1 link swap. The proposer gets a link from the other site and gives one back from
 * their own. Both sites must be listed in Exchange, the proposer's DR and traffic must fit the other
 * side's terms (and vice versa), and the two offers are created together by a database function.
 */
export async function sendExchangeOffer(input: unknown): Promise<ActionResult & { offerId?: string; offerRef?: string }> {
  const parsed = sendExchangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const d = parsed.data;
  const suspended = await suspensionMessage(supabase, userId);
  if (suspended) return { ok: false, error: suspended };

  const [{ data: mine }, { data: theirs }] = await Promise.all([
    supabase.from("sites").select("id, user_id, status, markets, domain, dr, traffic, exchange_terms").eq("id", d.buyerSiteId).is("archived_at", null).maybeSingle(),
    supabase.from("sites").select("id, user_id, status, markets, domain, dr, traffic, exchange_terms").eq("id", d.sellerSiteId).is("archived_at", null).maybeSingle(),
  ]);
  if (!mine || mine.user_id !== userId) return { ok: false, error: "Pick one of your own sites." };
  if (!theirs || theirs.status !== "active") return { ok: false, error: "That site is no longer available." };
  if (theirs.user_id === userId) return { ok: false, error: "You can't swap links with your own site." };
  if (mine.status !== "active") return { ok: false, error: "Your site must be active." };
  if (!mine.markets.includes("exchange") || !theirs.markets.includes("exchange")) return { ok: false, error: "Both sites must be listed in Exchange." };

  type Terms = { drMin: number; drMax: number; trafficMin: number; trafficMax: number | null } | null;
  const fits = (site: { dr: number; traffic: number }, t: Terms) =>
    !t || (site.dr >= t.drMin && site.dr <= t.drMax && site.traffic >= t.trafficMin && (t.trafficMax === null || site.traffic <= t.trafficMax));
  if (!fits(mine, theirs.exchange_terms as Terms)) return { ok: false, error: "Your site is outside this site's accepted DR or traffic range." };
  if (!fits(theirs, mine.exchange_terms as Terms)) return { ok: false, error: "That site is outside the DR or traffic range you accept." };

  // The other side may restrict which pages can host a link: exact slots, unless they also allow any page up to a capacity
  const theirTerms = theirs.exchange_terms as { specifyPages?: boolean; slots?: { page: string }[]; generalCapacity?: unknown } | null;
  if (theirTerms?.specifyPages && (theirTerms.slots?.length ?? 0) > 0 && !theirTerms.generalCapacity) {
    const norm = (u: string) => u.trim().replace(/\/$/, "").toLowerCase();
    if (!theirTerms.slots!.some((slot) => norm(slot.page) === norm(d.hostPage))) {
      return { ok: false, error: `${theirs.domain} only places links on the pages it listed — pick one of them.` };
    }
  }

  if (d.hostPage && !onSite(d.hostPage, theirs.domain)) return { ok: false, error: "The page that hosts your link must be on their site." };
  if (!onSite(d.targetUrl, mine.domain)) return { ok: false, error: "The link must point to a page on your site." };
  if (d.giveHostPage && !onSite(d.giveHostPage, mine.domain)) return { ok: false, error: "The page that hosts their link must be on your site." };
  if (!onSite(d.giveTargetUrl, theirs.domain)) return { ok: false, error: "Their link must point to a page on their site." };

  const { count: openCount } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", userId)
    .in("status", ["SENT", "ACCEPTED", "PAYMENT_RECEIVED", "DELIVERED"]);
  if ((openCount ?? 0) >= offerLimits.max) return { ok: false, error: `You can have at most ${offerLimits.max} open offers at once.` };
  const { data: sentToday } = await supabase.rpc("offers_sent_24h");
  if ((sentToday ?? 0) >= offerLimits.perDay) return { ok: false, error: `You can send at most ${offerLimits.perDay} offers per 24 hours. Try again later.` };

  const { data: existing } = await supabase
    .from("offers")
    .select("id")
    .eq("type", "exchange")
    .eq("buyer_site_id", mine.id)
    .eq("seller_site_id", theirs.id)
    .in("status", ["SENT", "ACCEPTED", "PAYMENT_RECEIVED", "DELIVERED"])
    .limit(1);
  if (existing?.length) return { ok: false, error: "You already have an open swap with this site." };

  const { data: offerId, error } = await supabase.rpc("send_exchange_offer", {
    p_buyer_site: mine.id,
    p_seller_site: theirs.id,
    p_host_page_a: d.hostPage,
    p_target_a: d.targetUrl,
    p_anchor_a: d.anchor,
    p_host_page_b: d.giveHostPage,
    p_target_b: d.giveTargetUrl,
    p_anchor_b: d.giveAnchor,
    p_message: d.message ?? null,
  });
  if (error || !offerId) return GENERIC;
  revalidatePath("/offers");
  revalidatePath("/", "layout");
  const { data: created } = await supabase.from("offers").select("ref").eq("id", offerId as string).maybeSingle();
  return { ok: true, offerId: offerId as string, offerRef: created?.ref };
}
