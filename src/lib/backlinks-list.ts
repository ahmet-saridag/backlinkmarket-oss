import { categories } from "@/lib/labels";
import { clampPage, oneOf, pageParams, sortParams, str, type SP } from "@/lib/list-params";
import { missingCase } from "@/lib/missing-links";
import type { Backlink, Category } from "@/lib/types";

export type Standing = "dofollow" | "missing";
export const standingOf = (b: Backlink): Standing => (b.live ? "dofollow" : "missing");
export const partnerOf = (b: Backlink) => (b.direction === "given" ? b.targetDomain : b.sourceDomain);

export const BACKLINK_SORT_KEYS = ["partner", "dr", "scan", "added"] as const;
export type BacklinkSortKey = (typeof BACKLINK_SORT_KEYS)[number];

export interface BacklinksPage {
  rows: Backlink[];
  total: number;
  page: number;
  pageSize: number;
  totalAll: number;
  summary: { liveLinks: number; strong: number; avgDr: number; expiring: number; missing: number; penalizedCount: number };
  /** ?case=<backlink id>: the missing link whose story is open, and your own link back if it was an exchange */
  openCase: Backlink | null;
  yours: Backlink | undefined;
  filters: {
    q: string;
    direction: "all" | Backlink["direction"];
    standing: "all" | Standing | "ended";
    category: "all" | Category;
    sort: { key: BacklinkSortKey; dir: "asc" | "desc" };
  };
}

/** Search, filters, sort and one page of backlinks, plus the summary cards for the chosen direction. */
export function queryBacklinks(all: Backlink[], sp: SP): BacklinksPage {
  const { page: wantedPage, pageSize } = pageParams(sp, 10);
  const filters = {
    q: str(sp, "q"),
    direction: oneOf(sp, "direction", ["all", "given", "received"] as const, "all"),
    standing: oneOf(sp, "state", ["all", "dofollow", "missing", "ended"] as const, "all"),
    category: oneOf(sp, "category", ["all", ...categories] as const, "all") as "all" | Category,
    sort: sortParams(sp, BACKLINK_SORT_KEYS, "dr", "desc"),
  };

  const inDirection = all.filter((b) => filters.direction === "all" || b.direction === filters.direction);
  const q = filters.q.toLowerCase();
  const sign = filters.sort.dir === "asc" ? 1 : -1;
  const matching = inDirection
    .filter(
      (b) =>
        // Ended deals are their own state; Dofollow / Missing only cover links that are still monitored
        (filters.standing === "all" || (filters.standing === "ended" ? b.status === "completed" : b.status === "active" && standingOf(b) === filters.standing)) &&
        (filters.category === "all" || b.category === filters.category) &&
        (!q || [b.sourceDomain, b.targetDomain, b.sourcePage, b.anchor, b.offerId].some((v) => v.toLowerCase().includes(q))),
    )
    .sort((a, b) => {
      const diff =
        filters.sort.key === "partner" ? partnerOf(a).localeCompare(partnerOf(b)) : filters.sort.key === "dr" ? a.partnerDr - b.partnerDr : filters.sort.key === "added" ? a.addedAt.localeCompare(b.addedAt) : a.lastScan.localeCompare(b.lastScan);
      return sign * diff;
    });

  const active = inDirection.filter((b) => b.status === "active");
  const liveLinks = active.filter((b) => standingOf(b) === "dofollow");
  const caseId = str(sp, "case");
  const openCase = all.find((b) => b.id === caseId && missingCase(b)) ?? null;
  const page = clampPage(wantedPage, matching.length, pageSize);

  return {
    rows: matching.slice((page - 1) * pageSize, page * pageSize),
    total: matching.length,
    page,
    pageSize,
    totalAll: all.length,
    summary: {
      liveLinks: liveLinks.length,
      strong: liveLinks.filter((b) => b.partnerDr >= 30).length,
      avgDr: liveLinks.length ? Math.round(liveLinks.reduce((a, b) => a + b.partnerDr, 0) / liveLinks.length) : 0,
      expiring: active.filter((b) => b.daysLeft !== null && b.daysLeft <= 30).length,
      missing: active.length - liveLinks.length,
      penalizedCount: active.filter((b) => missingCase(b)?.stage === "penalized").length,
    },
    openCase,
    yours: openCase ? all.find((x) => x.offerId === openCase.offerId && x.direction === "given") : undefined,
    filters,
  };
}
