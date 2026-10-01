import type { loadAbc, loadBacklinks, loadExchange, loadLanding, loadLogs, loadOffers, loadPaid, loadPayments, loadSites } from "@/lib/list-loaders";

/** The shape of each list's data — what the page renders first and what /api/lists/<name> returns afterwards. */
export type LandingList = Awaited<ReturnType<typeof loadLanding>>;
export type PaidList = Awaited<ReturnType<typeof loadPaid>>;
export type ExchangeList = Awaited<ReturnType<typeof loadExchange>>;
export type AbcList = Awaited<ReturnType<typeof loadAbc>>;
export type SitesList = Awaited<ReturnType<typeof loadSites>>;
export type OffersList = Awaited<ReturnType<typeof loadOffers>>;
export type BacklinksList = Awaited<ReturnType<typeof loadBacklinks>>;
export type PaymentsList = Awaited<ReturnType<typeof loadPayments>>;
export type LogsList = Awaited<ReturnType<typeof loadLogs>>;
