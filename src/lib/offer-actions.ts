import type { Offer } from "@/lib/types";

/** The current user places the link: the seller hosts it on every market (an exchange or ABC room is one offer per link). */
export const isDeliverer = (offer: Offer) => offer.direction === "received";

/**
 * Whether the offer is waiting on the current user (not on the counterparty).
 * - SENT, received: accept or decline
 * - ACCEPTED, paid market, you're the seller: confirm the payment landed
 * - PAYMENT_RECEIVED, you deliver: submit the live URL
 * - DELIVERED, sent: confirm/verify the delivered link
 * - ANOMALY_CHECK where you placed the link: restore it within the verification window
 */
export function needsAction(offer: Offer): boolean {
  switch (offer.status) {
    case "SENT":
      return offer.direction === "received";
    case "ACCEPTED":
      // Paid: the buyer has to pay, then the seller confirms it landed. Exchange / ABC: each host places their link.
      if (offer.type === "paid") return offer.direction === "sent" ? !offer.paymentSentAt : !!offer.paymentSentAt;
      return isDeliverer(offer);
    case "PAYMENT_RECEIVED":
      return isDeliverer(offer);
    case "DELIVERED":
      return offer.direction === "sent";
    case "ANOMALY_CHECK":
      return isDeliverer(offer);
    default:
      return false;
  }
}
