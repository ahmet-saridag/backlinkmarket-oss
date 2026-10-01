import { isDeliverer, needsAction } from "@/lib/offer-actions";
import type { Offer } from "@/lib/types";

/**
 * Where an offer stands from your side, in four buckets the Offers page groups by:
 *   action  — waiting on you (accept, deliver, verify, answer a dispute, fix a link)
 *   waiting — waiting on the other side (their reply, their delivery, a verdict)
 *   live    — link is up and running (paying out or monitored)
 *   closed  — finished one way or another
 */
export type OfferStage = "action" | "waiting" | "live" | "closed";

const CLOSED = new Set<Offer["status"]>(["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED", "VIOLATED_BANNED", "VIOLATED_NO_BAN"]);
const LIVE = new Set<Offer["status"]>(["ACTIVE_MONITORING"]);

/** A finished deal whose link is on the page and checked daily — done, but still very much alive. */
export const isLiveLink = (o: Offer) => o.status === "COMPLETED" && !!o.deliveredUrl && o.linkStatus?.live !== false;

export function offerStage(o: Offer): OfferStage {
  if (needsAction(o)) return "action";
  if (isLiveLink(o)) return "live";
  if (CLOSED.has(o.status)) return "closed";
  if (LIVE.has(o.status)) return "live";
  return "waiting";
}

export const stageMeta: Record<OfferStage, { label: string; hint: string }> = {
  action: { label: "Needs your action", hint: "accept, deliver or verify" },
  waiting: { label: "Waiting on them", hint: "their reply or delivery" },
  live: { label: "Live", hint: "link up, paying out or monitored" },
  closed: { label: "Closed", hint: "completed, declined or expired" },
};

/** One plain-language line: what happens next, and who's on the hook. */
export function nextStep(o: Offer): string {
  const you = isDeliverer(o);
  switch (o.status) {
    case "SENT":
      return o.direction === "received" ? "Accept or decline this offer" : "Waiting for them to accept";
    case "ACCEPTED":
      if (o.type !== "paid") return you ? "Place your link on your site · 72h" : "Waiting for them to place their link · 72h";
      if (o.direction === "sent") return o.paymentSentAt ? "You said you've paid · waiting for them to confirm" : "Pay them directly, then tell them you've paid";
      return o.paymentSentAt ? "The buyer says they've paid — confirm once it arrives" : "Waiting for the buyer to pay";
    case "PAYMENT_RECEIVED":
      return you ? "Deliver the link within 72h" : "Payment confirmed · waiting for them to deliver";
    case "DELIVERED":
      return "We're checking the page now";
    case "ACTIVE_MONITORING":
      return "Live · checked daily";
    case "ANOMALY_CHECK":
      return you ? "Link problem · restore it before the window ends" : "Link problem · being verified";
    case "COMPLETED":
      return o.deliveredUrl ? "Completed · the link is live, checked daily" : "Done";
    case "REJECTED":
      return o.direction === "sent" ? "They declined" : "You declined";
    case "CANCELLED":
      return "Cancelled · nothing was charged";
    case "EXPIRED":
      return "No reply in time";
    case "VIOLATED_BANNED":
      return "Seller banned";
    case "VIOLATED_NO_BAN":
      return "Site gone";
    default:
      return "";
  }
}

/** Short call to action for rows that need you, e.g. "Accept" or "Deliver". */
export function actionLabel(o: Offer): string | null {
  if (!needsAction(o)) return null;
  switch (o.status) {
    case "SENT":
      return "Review";
    case "ACCEPTED":
      if (o.type !== "paid") return "Place link";
      return o.direction === "sent" ? "Pay now" : "Confirm payment";
    case "PAYMENT_RECEIVED":
      return "Deliver";
    case "DELIVERED":
      return "Verify";
    case "ANOMALY_CHECK":
      return "Fix link";
    default:
      return "Open";
  }
}
