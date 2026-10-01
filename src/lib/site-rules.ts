import type { Offer, OfferStatus, UserSite } from "@/lib/types";

/** Payment already sent or a live link: deleting the site would break the deal, so it's blocked. */
export const DELETE_BLOCKING_STATUSES: OfferStatus[] = ["PAYMENT_RECEIVED", "DELIVERED", "ACTIVE_MONITORING", "ANOMALY_CHECK"];

/** No money or delivery yet: these offers are auto-cancelled (counterparty notified) on delete. */
export const DELETE_CANCELS_STATUSES: OfferStatus[] = ["SENT", "ACCEPTED"];

export type SiteDeleteState =
  | { kind: "free" }
  | { kind: "cancels"; offers: Offer[] }
  | { kind: "blocked"; offers: Offer[] };

export function siteOffers(site: UserSite, offers: Offer[]) {
  return offers.filter((o) => o.yourDomain === site.domain);
}

export function siteDeleteState(site: UserSite, offers: Offer[]): SiteDeleteState {
  const mine = siteOffers(site, offers);
  const blocking = mine.filter((o) => DELETE_BLOCKING_STATUSES.includes(o.status));
  if (blocking.length) return { kind: "blocked", offers: blocking };
  const pending = mine.filter((o) => DELETE_CANCELS_STATUSES.includes(o.status));
  if (pending.length) return { kind: "cancels", offers: pending };
  return { kind: "free" };
}

/**
 * Pausing hides the site from every market, so it can't take new offers. Same rules as delete:
 * blocked while a deal has payment already sent or a live link; pending offers are cancelled.
 */
export const sitePauseState = siteDeleteState;
