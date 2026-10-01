import { violationLabels } from "@/lib/standing-rules";
import type { MarketType, ViolationType } from "@/lib/types";

export type LogKind = "offer" | "link" | "penalty" | "payment";

export interface LogRow {
  at: string;
  kind: LogKind;
  event: string;
  detail: string | null;
  offerRef: string | null;
  market: MarketType | null;
  buyerDomain: string | null;
  sellerDomain: string | null;
  /** The viewer is the one hosting the link (the seller of that offer) */
  sellerYou: boolean;
  points: number | null;
  amount: number | null;
}

export const logKinds: Record<LogKind, { label: string; tone: string }> = {
  offer: { label: "Offer", tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  link: { label: "Link", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  penalty: { label: "Penalty", tone: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400" },
  payment: { label: "Payment", tone: "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400" },
};

const offerEvents: Record<string, string> = {
  SENT: "Offer sent",
  ACCEPTED: "Accepted",
  PAYMENT_RECEIVED: "Payment confirmed",
  DELIVERED: "Link placed — we checked the page",
  ACTIVE_MONITORING: "Link verified — now monitored daily",
  ANOMALY_CHECK: "Link needs attention",
  COMPLETED: "Completed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  VIOLATED_BANNED: "Link removed — host banned",
  VIOLATED_NO_BAN: "Link lost — site stayed down, no penalty",
};

const linkEvents: Record<string, string> = {
  missing: "Link not found on the page",
  nofollow: "Link is marked nofollow",
  anchor_changed: "Link text changed",
  unreachable: "Page could not be reached",
  restored: "Link is back",
  window_expired: "7-day window ended",
};

/** One line of plain words for a log row. */
export function describeLog(r: LogRow): { title: string; detail: string | null } {
  if (r.kind === "offer") return { title: offerEvents[r.event] ?? r.event, detail: r.detail };
  if (r.kind === "link") {
    if (r.event === "window_expired") return { title: linkEvents.window_expired, detail: r.detail === "site_down" ? "The site stayed down — no penalty." : (r.detail ?? "The link was still missing.") };
    return { title: linkEvents[r.event] ?? r.event, detail: r.detail };
  }
  if (r.kind === "penalty") {
    const label = violationLabels[r.event as ViolationType] ?? r.event;
    return { title: `${r.points ?? 0} penalty point${(r.points ?? 0) === 1 ? "" : "s"} — ${label}`, detail: null };
  }
  const amount = r.amount != null ? ` · $${r.amount.toFixed(2)}` : "";
  return { title: `${r.event === "received" ? "Payment received" : "Payment sent"}${amount}`, detail: r.detail };
}
