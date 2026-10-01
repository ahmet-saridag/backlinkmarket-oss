import "server-only";
import { offerStage, type OfferStage } from "@/lib/offer-stage";
import type { OfferWithMeta } from "@/lib/offers-data";
import { clampPage, oneOf, pageParams, sortParams, str, type SP } from "@/lib/list-params";
import type { Offer, UserSite } from "@/lib/types";

export const OFFER_SORT_KEYS = ["created", "amount"] as const;
export type OfferSortKey = (typeof OFFER_SORT_KEYS)[number];
const STAGES: OfferStage[] = ["action", "waiting", "live", "closed"];

export interface SiteStats {
  site: UserSite;
  total: number;
  open: number;
  action: number;
}

export interface OffersPage {
  offers: Offer[];
  total: number;
  page: number;
  pageSize: number;
  /** Everything you have, before any filter */
  totalOffers: number;
  siteCount: number;
  rail: { withOffers: SiteStats[]; idle: SiteStats[]; totalAction: number; sitesWithOffers: number };
  selectedSiteId: string | null;
  selected: SiteStats | null;
  stageCounts: Record<OfferStage, number>;
  inFlight: number;
  scopedCount: number;
  filters: {
    siteQuery: string;
    onlyAction: boolean;
    showIdle: boolean;
    stage: "all" | OfferStage;
    direction: "all" | Offer["direction"];
    market: "all" | Offer["type"];
    q: string;
    sort: { key: OfferSortKey; dir: "asc" | "desc" };
  };
}

/** Rail stats, the selected site's counters and one filtered, sorted, paged slice of the offers. */
export function queryOffers(all: OfferWithMeta[], sites: UserSite[], sp: SP): OffersPage {
  const { page: wantedPage, pageSize } = pageParams(sp, 10);
  const filters = {
    siteQuery: str(sp, "sq"),
    onlyAction: str(sp, "act") === "1",
    showIdle: str(sp, "idle") === "1",
    stage: oneOf(sp, "stage", ["all", ...STAGES] as const, "all"),
    direction: oneOf(sp, "direction", ["all", "sent", "received"] as const, "all"),
    market: oneOf(sp, "market", ["all", "paid", "exchange", "abc"] as const, "all"),
    q: str(sp, "q"),
    sort: sortParams(sp, OFFER_SORT_KEYS, "created", "desc"),
  };

  const by = new Map<string, SiteStats>(sites.map((s) => [s.domain, { site: s, total: 0, open: 0, action: 0 }]));
  for (const o of all) {
    const st = by.get(o.yourDomain);
    if (!st) continue;
    st.total++;
    const stage = offerStage(o);
    if (stage !== "closed") st.open++;
    if (stage === "action") st.action++;
  }
  // What needs you first, then the busiest, then A–Z
  const stats = [...by.values()].sort((a, b) => b.action - a.action || b.open - a.open || b.total - a.total || a.site.domain.localeCompare(b.site.domain));

  const sq = filters.siteQuery.toLowerCase();
  const matching = stats.filter((s) => (!sq || s.site.domain.includes(sq)) && (!filters.onlyAction || s.action > 0));
  const selectedSiteId = sites.some((s) => s.id === str(sp, "site")) ? str(sp, "site") : null;
  const selected = selectedSiteId ? (stats.find((s) => s.site.id === selectedSiteId) ?? null) : null;

  const scoped = selected ? all.filter((o) => o.yourDomain === selected.site.domain) : all;
  const stageCounts = Object.fromEntries(STAGES.map((st) => [st, scoped.filter((o) => offerStage(o) === st).length])) as Record<OfferStage, number>;
  const inFlight = scoped
    .filter((o) => o.type === "paid" && ["PAYMENT_RECEIVED", "DELIVERED", "ACTIVE_MONITORING", "ANOMALY_CHECK"].includes(o.status))
    .reduce((a, o) => a + (o.amount ?? 0), 0);

  const qq = filters.q.toLowerCase();
  const sign = filters.sort.dir === "asc" ? 1 : -1;
  const rows = scoped
    .filter(
      (o) =>
        (filters.stage === "all" || offerStage(o) === filters.stage) &&
        (filters.direction === "all" || o.direction === filters.direction) &&
        (filters.market === "all" || o.type === filters.market) &&
        (!qq || o.counterpartyDomain.includes(qq) || o.id.includes(qq) || o.yourDomain.includes(qq)),
    )
    .sort((a, b) => {
      // Needs-action rows always float to the top
      const act = Number(offerStage(b) === "action") - Number(offerStage(a) === "action");
      if (act) return act;
      const diff = filters.sort.key === "created" ? a.createdAt.localeCompare(b.createdAt) : (a.amount ?? 0) - (b.amount ?? 0);
      return sign * diff;
    });

  const page = clampPage(wantedPage, rows.length, pageSize);
  return {
    offers: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageSize,
    totalOffers: all.length,
    siteCount: sites.length,
    rail: {
      withOffers: matching.filter((s) => s.total > 0),
      idle: matching.filter((s) => s.total === 0),
      totalAction: stats.reduce((a, s) => a + s.action, 0),
      sitesWithOffers: stats.filter((s) => s.total > 0).length,
    },
    selectedSiteId,
    selected,
    stageCounts,
    inFlight,
    scopedCount: scoped.length,
    filters,
  };
}
