import { APP_URL } from "@/lib/app-url";
import { categoryLabels } from "@/lib/labels";
import { displayTraffic } from "@/lib/traffic-ranges";
import { payoutViaLabel } from "@/lib/validation/account";
import { violationLabels } from "@/lib/standing-rules";
import { clean, dateOnly, dateShort, day, dayLong, firstName, nextMonthStart, when } from "@/emails/format";
import type { Deal, LinkSpec, Market } from "@/emails/types";
import type { Category } from "@/lib/types";

/* ---------- what the database hands over for one email (see cron_email_context) ---------- */

type Row = Record<string, unknown>;
interface BriefLine {
  category?: Category;
  sellerPage?: string;
  targetUrl?: string;
  anchor?: string;
  duration?: string;
  total?: number;
}
export interface OfferRow {
  id: string;
  ref: string;
  type: Market;
  status: string;
  pair_id: string | null;
  buyer_user_id: string;
  seller_user_id: string;
  buyer_domain: string;
  seller_domain: string;
  buyer_dr: number;
  seller_dr: number;
  amount: number | string | null;
  anchor: string;
  target_url: string;
  message: string | null;
  brief: BriefLine[] | null;
  deliveries: Record<string, string> | null;
  deadline_at: string | null;
  term_ends_at: string | null;
  payment_sent_at: string | null;
  payment_proof_path: string | null;
  payment_reference: string | null;
  cancel_reason: string | null;
  anomaly: { issue: string; detectedAt: string; windowEndsAt: string } | null;
  violation: { reason?: string; points?: number; delivered?: boolean } | null;
  delivery_check: { attempt?: number; problems?: { label: string; reason: string }[] } | null;
  timeline: { status: string; at: string }[] | null;
  created_at: string;
}
interface Seat {
  seat: number;
  domain: string;
  dr: number;
  user_id: string;
  target_url?: string;
  anchor?: string;
}
export interface EmailContext {
  outbox: { id: number; template: string; key: string; ref: Row; attempts: number };
  to: { user_id: string | null; email: string | null; name: string | null; timezone: string; prefs: Record<string, boolean>; suspended_until?: string | null };
  offer?: OfferRow;
  partner?: OfferRow;
  buyer?: { name: string | null; email: string | null; dr: number | null; traffic: number | null };
  seller?: { name: string | null; email: string | null; dr: number | null; traffic: number | null };
  payout?: { method: "wire" | "paypal" | "crypto"; network: string | null };
  pool?: { ref: string; band: number; seats: Seat[]; host_site_id?: string };
  joiner?: { domain: string; dr: number };
  violation?: { id: string; type: string; points: number; created_at: string };
  month_points?: number;
  violator?: { name: string | null; email: string | null; suspended_until: string | null };
  payment?: { id: string; amount: number | string; type: "sent" | "received"; provider: string; date: string };
  site?: { id: string; domain: string; dr: number; dr_change_30d: number; dr_checked_at: string | null; traffic: number; markets: string[]; sitemap_page_count: number; user_id: string };
  summary?: { live: number; expiring: number; attention: number; dr_change: number; needs: { domain: string; text: string }[]; fresh: { domain: string; page: string }[] };
  queue?: { live: number; due_now: number; oldest_due_minutes: number; leased: number; unreachable: number };
}

export type Built = { skip: string } | { skip?: undefined; props: unknown };

const need = <T>(v: T | undefined | null, what: string): T => {
  if (v === undefined || v === null) throw new Error(`missing ${what}`);
  return v;
};

const bandLabels = ["DR 0–19", "DR 20–39", "DR 40–59", "DR 60+"];
const marketNamesShort: Record<string, string> = { paid: "Paid", exchange: "Exchange", abc: "ABC Pool" };

/* ---------- small pieces every builder shares ---------- */

const toNumber = (v: number | string | null | undefined) => Number(v ?? 0);

/** The deal as the reader sees it: their own site first, the other side second. */
function dealFor(ctx: EmailContext, offer: OfferRow = need(ctx.offer, "offer")): Deal {
  const me = ctx.to.user_id;
  const iAmBuyer = me === offer.buyer_user_id;
  return {
    ref: offer.ref,
    market: offer.type,
    yourDomain: iAmBuyer ? offer.buyer_domain : offer.seller_domain,
    otherDomain: iAmBuyer ? offer.seller_domain : offer.buyer_domain,
    url: `${APP_URL}/offers/${offer.ref}`,
  };
}

const HOURS_72 = 72 * 3_600_000;

/** When the step an offer is waiting on runs out: the stored deadline, or — if the offer has since moved on — 72 hours from when that step began. */
function dueAt(offer: OfferRow, since?: string | null): string | null {
  if (offer.deadline_at) return offer.deadline_at;
  const from = since ?? offer.timeline?.find((t) => t.status === offer.status)?.at ?? offer.created_at;
  return from ? new Date(Date.parse(from) + HOURS_72).toISOString() : null;
}

/** One link: the seller of the offer hosts it, pointing at the buyer. */
function linkOf(offer: OfferRow): LinkSpec {
  const line = offer.brief?.[0] ?? {};
  const placed = offer.deliveries ? Object.values(offer.deliveries)[0] : undefined;
  return {
    from: offer.seller_domain,
    to: offer.buyer_domain,
    page: clean(line.sellerPage || placed),
    target: clean(line.targetUrl || offer.target_url),
    anchor: line.anchor || offer.anchor,
  };
}

const monthsOf = (offer: OfferRow) => Math.max(0, ...(offer.brief ?? []).map((l) => (l.duration === "12m" ? 12 : l.duration === "6m" ? 6 : 0)));

const issueOf = (offer: OfferRow): "link_missing" | "nofollow" | "site_down" => {
  const i = offer.anomaly?.issue;
  return i === "nofollow" || i === "site_down" ? i : "link_missing";
};

/** Which way round the two links of a swap are for this reader. */
function swapFor(ctx: EmailContext) {
  const offer = need(ctx.offer, "offer");
  const partner = need(ctx.partner, "partner offer");
  const me = ctx.to.user_id;
  const both = [offer, partner];
  const received = both.find((o) => o.buyer_user_id === me) ?? offer;
  const hosted = both.find((o) => o.seller_user_id === me) ?? partner;
  return { youGet: linkOf(received), youGive: linkOf(hosted) };
}

const violationReason: Record<string, "no_response" | "payment_not_sent" | "no_delivery" | "one_sided"> = {
  seller_no_response_72h: "no_response",
  buyer_payment_not_sent: "payment_not_sent",
  seller_no_delivery_72h: "no_delivery",
  one_sided_delivery: "one_sided",
};

/* ---------- one builder per template ---------- */

type Builder = (ctx: EmailContext) => Built;
const ok = (props: unknown): Built => ({ props });

const builders: Record<string, Builder> = {
  T01: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const tz = ctx.to.timezone;
    const sender = { domain: offer.buyer_domain, owner: ctx.buyer?.name ?? "A member", dr: ctx.buyer?.dr ?? offer.buyer_dr, traffic: displayTraffic(ctx.buyer?.traffic ?? 0) };
    const base = { name: firstName(ctx.to.name), deal: dealFor(ctx), sender, respondBy: when(new Date(Date.parse(offer.created_at) + HOURS_72).toISOString(), tz), message: offer.message ?? undefined };
    if (offer.type === "paid") {
      return ok({
        ...base,
        total: toNumber(offer.amount),
        lines: (offer.brief ?? []).map((l) => ({ category: categoryLabels[l.category ?? "link_insertion"], target: clean(l.targetUrl) ?? "", anchor: l.anchor ?? "", price: l.total ?? 0 })),
      });
    }
    const partner = need(ctx.partner, "partner offer");
    return ok({ ...base, youGive: linkOf(offer), youGet: linkOf(partner) });
  },

  T02: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), total: offer.type === "paid" ? toNumber(offer.amount) : undefined, answerBy: when(new Date(Date.parse(offer.created_at) + HOURS_72).toISOString(), ctx.to.timezone) });
  },

  T03: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const tz = ctx.to.timezone;
    const base = { name: firstName(ctx.to.name), deal: dealFor(ctx), deadline: when(dueAt(offer, offer.timeline?.find((t) => t.status === "ACCEPTED")?.at), tz) };
    if (offer.type === "paid") {
      return ok({ ...base, total: toNumber(offer.amount), payoutMethod: ctx.payout ? payoutViaLabel(ctx.payout.method, ctx.payout.network) : undefined });
    }
    const partner = need(ctx.partner, "partner offer");
    return ok({ ...base, youPlace: linkOf(partner), theyPlace: linkOf(offer) });
  },

  T04: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx) }),
  T05: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx) }),
  T06: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx) }),

  T07: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), reason: offer.cancel_reason || "No reason given." });
  },

  T08: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), step: need(ctx.outbox.ref.step as string, "step"), deadline: when(dueAt(offer), ctx.to.timezone) });
  },

  T09: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const tz = ctx.to.timezone;
    const paid = new Date(need(offer.payment_sent_at, "payment_sent_at"));
    return ok({
      name: firstName(ctx.to.name),
      deal: dealFor(ctx),
      amount: toNumber(offer.amount),
      paidAt: when(offer.payment_sent_at, tz),
      reference: offer.payment_reference ?? undefined,
      confirmBy: when(new Date(paid.getTime() + 72 * 3_600_000).toISOString(), tz),
    });
  },

  T10: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({
      name: firstName(ctx.to.name),
      deal: dealFor(ctx),
      amount: toNumber(offer.amount),
      placeBy: when(dueAt(offer, offer.timeline?.find((t) => t.status === "PAYMENT_RECEIVED")?.at), ctx.to.timezone),
      lines: (offer.brief ?? []).map((l) => `${categoryLabels[l.category ?? "link_insertion"]} — “${l.anchor ?? ""}” → ${clean(l.targetUrl) ?? ""}`),
    });
  },

  T11: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), amount: toNumber(need(ctx.offer, "offer").amount) }),

  T12: (ctx) => {
    const pay = need(ctx.payment, "payment");
    const method = ctx.payout ? payoutViaLabel(ctx.payout.method, ctx.payout.network) : pay.provider;
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), amount: toNumber(pay.amount), direction: pay.type, method, date: dayLong(pay.date, ctx.to.timezone), paymentId: pay.id });
  },

  T13: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const problems = offer.delivery_check?.problems ?? [];
    return ok({
      name: firstName(ctx.to.name),
      deal: dealFor(ctx),
      attempt: offer.delivery_check?.attempt ?? 1,
      problems: problems.length ? problems : [{ label: "Your page", reason: "We could not find everything." }],
      deadline: when(dueAt(offer), ctx.to.timezone),
      stuck: problems.some((p) => /could not finish|couldn't finish/i.test(p.reason)),
    });
  },

  T14: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), role: need(ctx.outbox.ref.role as string, "role"), link: linkOf(offer), until: offer.term_ends_at ? dayLong(offer.term_ends_at, ctx.to.timezone) : undefined });
  },

  T15: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), ...swapFor(ctx) }),

  T16: (ctx) => {
    const pool = need(ctx.pool, "pool");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), poolRef: pool.ref, seats: pool.seats.map((s) => s.domain) });
  },

  T17: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), daysLeft: Number(ctx.outbox.ref.days) === 7 ? 7 : 30, endsOn: dayLong(offer.term_ends_at, ctx.to.timezone), link: linkOf(offer) });
  },

  T18: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const started = offer.timeline?.find((t) => t.status === "ACTIVE_MONITORING")?.at;
    const days = started ? Math.max(1, Math.round((Date.now() - Date.parse(started)) / 86_400_000)) : monthsOf(offer) * 30;
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), link: linkOf(offer), months: monthsOf(offer), days });
  },

  T19: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), kind: need(ctx.outbox.ref.kind as string, "kind"), delivered: ctx.outbox.ref.delivered !== false }),

  T20: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const a = need(offer.anomaly, "anomaly");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), issue: issueOf(offer), link: linkOf(offer), windowEnds: dateShort(a.windowEndsAt), detectedAt: day(a.detectedAt, ctx.to.timezone) });
  },

  T21: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const a = need(offer.anomaly, "anomaly");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), issue: issueOf(offer), link: linkOf(offer), windowEnds: dateShort(a.windowEndsAt) });
  },

  T22: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const a = need(offer.anomaly, "anomaly");
    return ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), role: need(ctx.outbox.ref.role as string, "role"), issue: issueOf(offer), link: linkOf(offer), endsAt: `${dateShort(a.windowEndsAt)} · 23:59 UTC` });
  },

  T23: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), role: need(ctx.outbox.ref.role as string, "role"), link: linkOf(need(ctx.offer, "offer")) }),

  T24: (ctx) => {
    const offer = need(ctx.offer, "offer");
    return ok({
      name: firstName(ctx.to.name),
      deal: dealFor(ctx),
      link: linkOf(offer),
      bannedUntil: dateOnly(ctx.to.suspended_until) || "90 days from now",
      reason: offer.violation?.reason || "The link stayed missing for 7 days after we reported it.",
    });
  },

  T25: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), link: linkOf(need(ctx.offer, "offer")) }),

  T26: (ctx) => ok({ name: firstName(ctx.to.name), deal: dealFor(ctx), role: need(ctx.outbox.ref.role as string, "role"), link: linkOf(need(ctx.offer, "offer")) }),

  T27: (ctx) => {
    const vio = need(ctx.violation, "violation");
    const offer = need(ctx.offer, "offer");
    const reason = violationReason[vio.type];
    if (!reason) return { skip: `no template for violation ${vio.type}` };
    const iAmBuyer = ctx.to.user_id === offer.buyer_user_id;
    return ok({ name: firstName(ctx.to.name), reason, points: vio.points, totalThisMonth: ctx.month_points ?? vio.points, resetsOn: nextMonthStart(ctx.to.timezone), offerRef: offer.ref, domain: iAmBuyer ? offer.seller_domain : offer.buyer_domain });
  },

  T28: (ctx) => ok({ name: firstName(ctx.to.name), cause: ctx.outbox.ref.cause === "paid" ? "paid" : "points", until: dateOnly(ctx.to.suspended_until) || "90 days from now", offerRef: ctx.offer?.ref }),

  T29: (ctx) => ok({ name: firstName(ctx.to.name) }),

  T31: (ctx) => {
    const pool = need(ctx.pool, "pool");
    const joiner = need(ctx.joiner, "joiner");
    const mine = pool.seats.find((s) => s.user_id === ctx.to.user_id);
    return ok({ name: firstName(ctx.to.name), poolRef: pool.ref, joiner, filled: pool.seats.length, yourDomain: mine?.domain ?? pool.seats[0]?.domain ?? "" });
  },

  T32: (ctx) => {
    const pool = need(ctx.pool, "pool");
    const offer = need(ctx.offer, "offer");
    const mine = need(pool.seats.find((s) => s.user_id === ctx.to.user_id), "your seat");
    return ok({
      name: firstName(ctx.to.name),
      poolRef: pool.ref,
      seats: pool.seats.map((s) => s.domain),
      you: mine.domain,
      deadline: when(dueAt(offer, offer.timeline?.find((t) => t.status === "ACCEPTED")?.at), ctx.to.timezone),
      yourPage: clean(mine.target_url) ?? mine.domain,
      yourAnchor: mine.anchor ?? mine.domain,
    });
  },

  T33: (ctx) => {
    const pool = need(ctx.pool, "pool");
    return ok({ name: firstName(ctx.to.name), poolRef: pool.ref, left: String(ctx.outbox.ref.left_domain ?? "A member"), filled: pool.seats.length });
  },

  T34: (ctx) => {
    const pool = need(ctx.pool, "pool");
    return ok({ name: firstName(ctx.to.name), yourDomain: pool.seats[0]?.domain ?? "your site", poolRef: pool.ref, band: bandLabels[pool.band] ?? "" });
  },

  T35: (ctx) => {
    const site = need(ctx.site, "site");
    return ok({
      name: firstName(ctx.to.name),
      domain: site.domain,
      dr: site.dr > 0 ? site.dr : null,
      traffic: displayTraffic(site.traffic),
      markets: site.markets.map((m) => marketNamesShort[m] ?? m),
      pages: site.sitemap_page_count,
    });
  },

  T36: (ctx) => {
    const site = need(ctx.site, "site");
    return ok({ name: firstName(ctx.to.name), domain: site.domain, from: site.dr - site.dr_change_30d, to: site.dr, days: 30 });
  },

  T37: (ctx) => {
    const site = need(ctx.site, "site");
    const days = site.dr_checked_at ? Math.max(1, Math.round((Date.now() - Date.parse(site.dr_checked_at)) / 86_400_000)) : 7;
    // A domain that isn't its own registrable domain (a subdomain) has no rating of its own
    const parts = site.domain.split(".");
    return ok({ name: firstName(ctx.to.name), domain: site.domain, days, lastKnown: site.dr, cause: parts.length > 2 && !/^(www)$/.test(parts[0]) ? "subdomain" : "unavailable" });
  },

  T38: (ctx) => {
    const site = need(ctx.site, "site");
    const r = ctx.outbox.ref;
    return ok({ name: firstName(ctx.to.name), domain: site.domain, cause: r.cause === "dropped" ? "dropped" : "unreadable", was: Number(r.was) || undefined, now: r.now === undefined ? undefined : Number(r.now) });
  },

  T39: (ctx) => ok({ name: firstName(ctx.to.name), trigger: ctx.outbox.ref.trigger === "offer" ? "offer" : "listing", domain: ctx.site?.domain ?? ctx.offer?.seller_domain ?? "your site" }),

  T40: (ctx) => ok({ name: firstName(ctx.to.name) }),

  T41: (ctx) => {
    const s = need(ctx.summary, "summary");
    return ok({
      name: firstName(ctx.to.name),
      week: day(new Date(Date.now() - 7 * 86_400_000).toISOString(), ctx.to.timezone),
      live: s.live,
      expiring: s.expiring,
      attention: s.attention,
      drChange: s.dr_change,
      needsYou: s.needs,
      newLinks: s.fresh.map((f) => ({ domain: f.domain, page: clean(f.page) ?? "" })),
    });
  },

  T42: (ctx) => {
    const offer = need(ctx.offer, "offer");
    const closed = [...(offer.timeline ?? [])].reverse().find((t) => t.status === "CANCELLED")?.at;
    return ok({
      offerRef: offer.ref,
      amount: toNumber(offer.amount),
      buyer: offer.buyer_domain,
      seller: offer.seller_domain,
      claimedAt: `${when(offer.payment_sent_at, "UTC")} UTC`,
      closedAt: `${when(closed, "UTC")} UTC`,
      proofPath: offer.payment_proof_path ?? "none",
    });
  },

  T43: (ctx) => {
    const vio = need(ctx.violation, "violation");
    return ok({
      account: ctx.violator?.name ?? "Unknown",
      email: ctx.violator?.email ?? "",
      cause: vio.type === "link_removed" ? "Live link removed and not restored within 7 days" : (violationLabels as Record<string, string>)[vio.type] ?? vio.type,
      offerRef: ctx.offer?.ref ?? "",
      until: dateOnly(ctx.violator?.suspended_until) || "90 days",
      points: vio.points,
    });
  },

  T44: (ctx) => {
    const kind = String(ctx.outbox.ref.kind);
    const q = need(ctx.queue, "queue");
    const queue = { live: q.live, dueNow: q.due_now, oldestDueMinutes: q.oldest_due_minutes, leased: q.leased, unreachable: q.unreachable };
    const at = `${when(new Date().toISOString(), "UTC")} UTC`;
    if (kind === "dr") return ok({ severity: "warning", what: "Domain Rating reads are failing", detail: "At least one site hasn't had its Domain Rating read for over 48 hours.", queue, at });
    if (kind === "email") return ok({ severity: "critical", what: "Emails are failing to send", detail: "At least one email ran out of retries in the last hour.", queue, at });
    return ok({ severity: "critical", what: "The link scan queue is backing up", detail: "Links are waiting more than 30 minutes past their scheduled check.", queue, at });
  },
};

/** Turn what the database knows into the props of the template, or say why this email shouldn't go. */
export function buildProps(template: string, ctx: EmailContext): Built {
  const b = builders[template];
  if (!b) return { skip: `unknown template ${template}` };
  try {
    return b(ctx);
  } catch (e) {
    return { skip: e instanceof Error ? e.message : "could not build" };
  }
}
