import "server-only";
import { finalDayWarning } from "@/lib/anomaly-warning";
import { sellersById } from "@/lib/market-data";
import { createClient } from "@/lib/supabase/server";
import type {
  Backlink,
  Category,
  LinkDuration,
  LinkStatus,
  MarketType,
  NotificationItem,
  Offer,
  OfferBriefLine,
  OfferStatus,
} from "@/lib/types";

type OfferRow = {
  id: string;
  ref: string;
  type: string;
  status: string;
  buyer_user_id: string;
  seller_user_id: string;
  buyer_domain: string;
  seller_domain: string;
  buyer_dr: number;
  seller_dr: number;
  categories: string[];
  anchor: string;
  target_url: string;
  amount: number | string | null;
  cooldown_until: string;
  delivered_url: string | null;
  link_status: LinkStatus | null;
  anomaly: Offer["anomaly"] | null;
  violation: Offer["violation"] | null;
  brief: OfferBriefLine[] | null;
  timeline: { status: OfferStatus; at: string }[] | null;
  created_at: string;
  pair_id: string | null;
  payment_sent_at: string | null;
  payment_proof_path: string | null;
  payment_reference: string | null;
  cancel_reason: string | null;
  deliveries: Record<string, string> | null;
  cancelled_by: string | null;
  message: string | null;
  delivery_check: Offer["deliveryCheck"] | null;
};

/** Times travel as UTC ISO strings; each viewer's screen formats them in their own time zone. */
export const formatStamp = (iso: string) => new Date(iso).toISOString();

/** A row as the signed-in user sees it: "sent" if they're the buyer, "received" if they're the seller. */
function toOffer(row: OfferRow, viewerId: string): Offer {
  const isBuyer = row.buyer_user_id === viewerId;
  return {
    id: row.id,
    ref: row.ref,
    type: row.type as MarketType,
    direction: isBuyer ? "sent" : "received",
    status: row.status as OfferStatus,
    yourDomain: isBuyer ? row.buyer_domain : row.seller_domain,
    counterpartyDomain: isBuyer ? row.seller_domain : row.buyer_domain,
    categories: row.categories as Category[],
    anchor: row.anchor,
    targetUrl: row.target_url,
    amount: row.amount === null ? undefined : Number(row.amount),
    createdAt: formatStamp(row.created_at),
    cooldownMinutesLeft: Math.max(0, Math.ceil((new Date(row.cooldown_until).getTime() - Date.now()) / 60_000)),
    deliveredUrl: row.delivered_url ?? undefined,
    paymentSentAt: row.payment_sent_at ? formatStamp(row.payment_sent_at) : undefined,
    paymentProofPath: row.payment_proof_path ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    message: row.message ?? undefined,
    deliveries: row.deliveries && Object.keys(row.deliveries).length ? row.deliveries : undefined,
    deliveryCheck: row.delivery_check ?? undefined,
    linkStatus: row.link_status ?? undefined,
    brief: row.brief?.length ? row.brief : undefined,
    anomaly: row.anomaly ?? undefined,
    violation: row.violation ?? undefined,
    penalizedViewer: !!row.violation?.userId && row.violation.userId === viewerId,
    timeline: (row.timeline ?? []).map((t) => ({ status: t.status, at: formatStamp(t.at) })),
  };
}

export type OfferWithMeta = Offer & { counterpartyDr: number; yourDr: number; timelineRaw: { status: OfferStatus; at: string }[]; paymentSentAtRaw: string | null;
  /** Exchange: the second offer of a swap (the link back). It carries no messages of its own — the first offer speaks for both. */
  isMirror: boolean;
  /** You were the one who withdrew (so you aren't told about your own action) */
  cancelledByViewer: boolean;
  /** The system decided this offer (a 72-hour deadline ran out, or a link stayed gone) and you are the one it penalised */
  penalizedViewer: boolean;
};

function withMeta(row: OfferRow, viewerId: string): OfferWithMeta {
  const isBuyer = row.buyer_user_id === viewerId;
  return {
    ...toOffer(row, viewerId),
    counterpartyDr: isBuyer ? row.seller_dr : row.buyer_dr,
    yourDr: isBuyer ? row.buyer_dr : row.seller_dr,
    timelineRaw: row.timeline ?? [],
    paymentSentAtRaw: row.payment_sent_at,
    isMirror: row.type === "exchange" && !!row.pair_id && row.pair_id !== row.id,
    cancelledByViewer: row.cancelled_by === viewerId,
    penalizedViewer: !!row.violation?.userId && row.violation.userId === viewerId,
  };
}

/** An exchange is two offers; until it's accepted only the proposal itself is shown, not its mirror (the link back). */
const isVisible = (r: OfferRow) => !(r.type === "exchange" && r.status === "SENT" && r.pair_id !== r.id);

/** Every offer the signed-in user is part of, newest first. */
export async function listOffersForViewer(): Promise<OfferWithMeta[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
  return ((data ?? []) as OfferRow[]).filter(isVisible).map((r) => withMeta(r, auth.user.id));
}

export async function getOfferForViewer(ref: string): Promise<OfferWithMeta | undefined> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return undefined;
  const { data } = await supabase.from("offers").select("*").eq("ref", ref).maybeSingle();
  if (!data || !isVisible(data as OfferRow)) return undefined;
  const offer = withMeta(data as OfferRow, auth.user.id);
  const theirUserId = (data as OfferRow).buyer_user_id === auth.user.id ? (data as OfferRow).seller_user_id : (data as OfferRow).buyer_user_id;
  const [seller, { data: prof }] = await Promise.all([sellersById([theirUserId]).then((m) => m.get(theirUserId)), supabase.rpc("get_counterparty_profile", { p_user: theirUserId })]);
  const p = (prof as { full_name: string | null; email: string | null; country: string | null }[] | null)?.[0];
  if (seller) offer.counterpartyOwner = { ...seller, name: p?.full_name || seller.name, email: p?.email ?? undefined, country: p?.country ?? undefined };
  const { data: theirSite } = await supabase.from("sites").select("dr, traffic, niches, language, country, spam_score, created_at, markets").eq("domain", offer.counterpartyDomain).maybeSingle();
  if (theirSite) offer.counterpartySite = { dr: theirSite.dr, traffic: theirSite.traffic, niches: theirSite.niches ?? [], language: theirSite.language, country: theirSite.country, spamScore: theirSite.spam_score, listedAt: theirSite.created_at, markets: theirSite.markets ?? [] };
  if (offer.type === "exchange" && data.pair_id) {
    const { data: partner } = await supabase.from("offers").select("brief").eq("pair_id", data.pair_id).neq("id", data.id).maybeSingle();
    offer.reciprocalBrief = (partner?.brief as OfferBriefLine[] | undefined)?.[0];
  }
  if (offer.type === "abc" && data.pair_id) {
    const [{ data: room }, { data: seats }, { data: mine }] = await Promise.all([
      supabase.from("abc_rooms").select("ref").eq("id", data.pair_id).maybeSingle(),
      supabase.rpc("abc_room_seats"),
      supabase.from("offers").select("ref, status, buyer_user_id, seller_user_id, buyer_domain, seller_domain").eq("pair_id", data.pair_id),
    ]);
    const give = (mine ?? []).find((o) => o.seller_user_id === auth.user.id);
    const get = (mine ?? []).find((o) => o.buyer_user_id === auth.user.id);
    offer.pool = {
      ref: (room?.ref as string | undefined) ?? "",
      seats: (seats ?? [])
        .filter((s: { room_id: string }) => s.room_id === data.pair_id)
        .map((s: { seat: number; domain: string; dr: number; mine: boolean }) => ({ seat: s.seat, domain: s.domain, dr: s.dr, mine: s.mine })),
      give: give ? { ref: give.ref, status: give.status as OfferStatus, domain: give.buyer_domain } : undefined,
      get: get ? { ref: get.ref, status: get.status as OfferStatus, domain: get.seller_domain } : undefined,
    };
  }
  return offer;
}

/* ---------- derived views: backlinks and notifications come from offers ---------- */

const DAY = 86_400_000;
const LIVE_STATES: OfferStatus[] = ["ACTIVE_MONITORING", "ANOMALY_CHECK", "COMPLETED"];

/** A delivered, verified link is a backlink. The seller hosts it ("given"), the buyer receives it. */
export function backlinksFromOffers(offers: OfferWithMeta[]): Backlink[] {
  const out: Backlink[] = [];
  for (const o of offers) {
    if (!o.deliveredUrl || !LIVE_STATES.includes(o.status)) continue;
    const sellerIsYou = o.direction === "received";
    const line = o.brief?.[0];
    const duration: LinkDuration = line?.duration ?? "forever";
    const delivered = o.timelineRaw.find((t) => t.status === "DELIVERED")?.at;
    const months = duration === "12m" ? 12 : duration === "6m" ? 6 : null;
    const daysLeft = months && delivered ? Math.max(0, Math.round(months * 30 - (Date.now() - new Date(delivered).getTime()) / DAY)) : null;
    let sourcePage = "/";
    try {
      sourcePage = new URL(o.deliveredUrl).pathname || "/";
    } catch {}
    out.push({
      id: o.id,
      direction: sellerIsYou ? "given" : "received",
      market: o.type,
      sourceDomain: sellerIsYou ? o.yourDomain : o.counterpartyDomain,
      sourcePage,
      targetDomain: sellerIsYou ? o.counterpartyDomain : o.yourDomain,
      anchor: o.anchor,
      partnerDr: o.counterpartyDr,
      category: o.categories[0],
      live: o.linkStatus?.live ?? true,
      lastScan: o.linkStatus?.lastScan ?? o.createdAt,
      duration,
      daysLeft,
      // A permanent ("forever") placement is a completed deal but a link that is still live and checked daily
      status: o.status === "COMPLETED" && duration !== "forever" ? "completed" : "active",
      offerId: o.id,
      offerRef: o.ref,
      addedAt: o.createdAt,
      missingSince: o.anomaly?.detectedAt.slice(0, 10),
    });
  }
  return out;
}

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

/**
 * Events on your offers that concern you, newest first. Derived — there's no separate notifications table.
 * Unread means it happened after the last time you opened the bell (`readAt`).
 */
export function notificationsFromOffers(offers: OfferWithMeta[], readAt: string | null): NotificationItem[] {
  const items: NotificationItem[] = [];
  const push = (o: OfferWithMeta, id: string, at: string, n: Pick<NotificationItem, "kind" | "title" | "detail">) =>
    items.push({
      id: `${o.id}-${id}`,
      ...n,
      domain: o.counterpartyDomain,
      market: o.type,
      href: `/offers/${o.ref}`,
      time: ago(at),
      at,
      read: !!readAt && at <= readAt,
    });

  for (const o of offers) {
    const isSeller = o.direction === "received";
    const money = o.amount ? ` · $${o.amount}` : "";
    for (const [ti, t] of o.timelineRaw.entries()) {
      const prev = o.timelineRaw[ti - 1];
      // Decisions the system took itself: a deadline ran out, or a link stayed gone. Same words for every market.
      const v = o.violation;
      if (o.isMirror && t.status === "EXPIRED") continue; // the swap's first offer already told both sides
      if (v && (t.status === "CANCELLED" || t.status === "EXPIRED" || t.status === "VIOLATED_BANNED" || t.status === "VIOLATED_NO_BAN") && !o.cancelledByViewer && (v.userId || v.kind === "partner_failed" || t.status === "VIOLATED_NO_BAN")) {
        const pts = v.points ?? 0;
        const tail = pts > 0 ? ` +${pts} penalty point${pts > 1 ? "s" : ""}${v.suspendedUntil ? ` · you are banned until ${v.suspendedUntil}` : ""}` : "";
        const suspended = !!v.suspendedUntil;
        if (v.kind === "partner_failed") {
          // The other side of a swap never placed their link: whoever did place theirs is told to take it down
          if (isSeller) {
            const pool = o.type === "abc";
            push(o, t.status, t.at, {
              kind: "partner_penalized",
              title: pool ? "Pool closed — a member didn't place their link in time" : `Swap cancelled — ${o.counterpartyDomain} didn't place their link`,
              detail: v.delivered === false ? "We penalised them. You no longer need to place your link." : "We penalised them. You can take your link down.",
            });
          }
        } else if (t.status === "VIOLATED_NO_BAN") {
          push(o, t.status, t.at, { kind: "link_missing", title: "The link was lost — the site stayed down", detail: `${v.reason} No penalty.` });
        } else if (o.penalizedViewer) {
          const title =
            t.status === "VIOLATED_BANNED"
              ? "Your link was removed — you are banned"
              : t.status === "EXPIRED"
                ? "You didn't answer in 72 hours"
                : suspended
                  ? "72 hours ran out — you are banned"
                  : "72 hours ran out — penalty point added";
          push(o, t.status, t.at, { kind: "penalty", title, detail: `${v.reason}${tail}` });
        } else {
          const title =
            t.status === "VIOLATED_BANNED"
              ? `${o.counterpartyDomain} removed the link — they were penalised`
              : t.status === "EXPIRED"
                ? "Your offer expired"
                : `Offer cancelled — ${o.counterpartyDomain} ran out of time`;
          push(o, t.status, t.at, { kind: t.status === "EXPIRED" ? "offer_expired" : "partner_penalized", title, detail: v.reason });
        }
        continue;
      }
      if (o.type === "abc") {
        // A pool's three links are created already accepted when the room locks
        if (t.status === "ACCEPTED")
          push(o, t.status, t.at, {
            kind: "abc_room",
            title: isSeller ? "Your pool locked — place your link" : "Your pool locked",
            detail: isSeller ? `Put a link to ${o.counterpartyDomain} on ${o.yourDomain} within 72 hours` : `${o.counterpartyDomain} will link to ${o.yourDomain}`,
          });
      } else if (o.isMirror) {
        // The second offer of a swap: the first one already told both sides
      } else if (o.type === "exchange") {
        if (t.status === "SENT" && isSeller) push(o, t.status, t.at, { kind: "exchange_match", title: "New swap proposal", detail: `${o.counterpartyDomain} wants to swap links with ${o.yourDomain}` });
        if (t.status === "ACCEPTED" && !isSeller) push(o, t.status, t.at, { kind: "offer_accepted", title: "Your swap was accepted", detail: `Place your link on ${o.yourDomain} within 72 hours — theirs goes up too` });
        if (t.status === "REJECTED" && !isSeller) push(o, t.status, t.at, { kind: "offer_declined", title: "Your swap was declined", detail: `${o.counterpartyDomain} said no` });
        if (t.status === "CANCELLED" && !o.cancelledByViewer) push(o, t.status, t.at, { kind: "offer_withdrawn", title: `${o.counterpartyDomain} withdrew from the swap`, detail: o.cancelReason ?? "Nothing was placed" });
      } else {
        if (t.status === "SENT" && isSeller) push(o, t.status, t.at, { kind: "offer_received", title: "New offer received", detail: `For ${o.yourDomain}${money}` });
        if (t.status === "ACCEPTED" && !isSeller) push(o, t.status, t.at, { kind: "offer_accepted", title: "Your offer was accepted", detail: `Pay them directly${money} — their payout details are on the offer` });
        if (t.status === "REJECTED" && !isSeller) push(o, t.status, t.at, { kind: "offer_declined", title: "Your offer was declined", detail: `${o.counterpartyDomain} said no${money}` });
        if (t.status === "CANCELLED" && isSeller && !o.cancelledByViewer) push(o, t.status, t.at, { kind: "offer_withdrawn", title: "The buyer withdrew the offer", detail: o.cancelReason ?? `For ${o.yourDomain}${money}` });
        if (t.status === "CANCELLED" && !isSeller && !o.cancelledByViewer) push(o, t.status, t.at, { kind: "offer_withdrawn", title: "The seller says your payment did not arrive", detail: `${o.cancelReason ?? "The offer was closed."} Your proof stays on record.` });
        if (t.status === "PAYMENT_RECEIVED" && !isSeller) push(o, t.status, t.at, { kind: "payment_received", title: "Payment confirmed", detail: "They'll place your link next" });
      }
      const restored = prev?.status === "ANOMALY_CHECK" && (t.status === "ACTIVE_MONITORING" || t.status === "COMPLETED");
      const termEnded = t.status === "COMPLETED" && prev?.status === "ACTIVE_MONITORING" && Date.parse(t.at) - Date.parse(prev.at) > 60_000;
      if (restored)
        push(o, `${t.status}-${ti}`, t.at, { kind: "link_verified", title: "The link is back", detail: isSeller ? `We found it on ${o.yourDomain} again — no penalty` : `${o.counterpartyDomain} put it back and we verified it` });
      else if (termEnded)
        push(o, `${t.status}-${ti}`, t.at, { kind: "link_verified", title: "Placement term ended — deal complete", detail: isSeller ? `The link on ${o.yourDomain} did its time` : `${o.counterpartyDomain}'s link did its time` });
      else if (t.status === "ACTIVE_MONITORING")
        push(o, t.status, t.at, {
          kind: "link_verified",
          title: isSeller ? "Your link checked out — it's live" : "Your link is live",
          detail: isSeller ? `On ${o.yourDomain}` : `${o.counterpartyDomain} placed it and we verified it`,
        });
      if (t.status === "ANOMALY_CHECK") {
        const issue = o.anomaly?.issue;
        const what = issue === "nofollow" ? "is marked nofollow" : issue === "site_down" ? "can't be reached — the site is down" : "is missing from the page";
        push(o, `${t.status}-${ti}`, t.at, {
          kind: "link_missing",
          title: isSeller ? "Your link needs attention — put it back within 7 days" : "A link to your site needs attention",
          detail: isSeller ? `The link ${what}. If it isn't fixed in 7 days the deal is closed${issue === "site_down" ? " (no penalty for a site that is down)" : " and your account is banned"}.` : `${o.counterpartyDomain}'s link ${what}. They have 7 days to put it back.`,
        });
      }
    }
    // The last day of the 7-day window: a link that is still missing has 24 hours left
    const warn = o.status === "ANOMALY_CHECK" ? finalDayWarning(o.anomaly) : null;
    if (warn) {
      const site = o.anomaly?.issue === "site_down";
      push(o, "FINAL-DAY", warn.at, {
        kind: isSeller ? "penalty" : "link_missing",
        title: isSeller ? "24 hours left to put your link back" : `${o.counterpartyDomain} has 24 hours left to put the link back`,
        detail: isSeller ? `After that the deal is closed${site ? "" : " and your account is banned for 90 days"}.` : "If it isn't back by then the deal is closed and they are penalised.",
      });
    }
    // We looked at the seller's page and something was missing: they need to know exactly what
    if (isSeller && o.deliveryCheck?.ok === false && o.deliveryCheck.at)
      push(o, `CHECK-${o.deliveryCheck.attempt}`, o.deliveryCheck.at, {
        kind: "link_missing",
        title: "We couldn't find everything on your page",
        detail: o.deliveryCheck.problems[0]?.reason ?? "Open the offer to see what to fix",
      });
    if (o.paymentSentAtRaw && isSeller) push(o, "PAYMENT_SENT", o.paymentSentAtRaw, { kind: "payment_sent", title: "The buyer says they've paid", detail: `Confirm once it reaches you${money}` });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
}

/** The short reference behind an old uuid link to an offer, so it can redirect. */
export async function refOfOfferId(id: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("ref").eq("id", id).maybeSingle();
  return data?.ref ?? undefined;
}
