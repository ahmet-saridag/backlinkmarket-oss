import "server-only";
import { getAbcBoard } from "@/lib/abc-data";
import { queryBacklinks } from "@/lib/backlinks-list";
import { categories, countries, niches } from "@/lib/labels";
import { clampPage, csv, int, likeTerm, oneOf, pageParams, sortParams, str, type SP } from "@/lib/list-params";
import { defaultDir, publicMarketCounts, queryMarketSites, type MarketQuery } from "@/lib/market-data";
import { exchangeFits, rangeProblem } from "@/lib/market-rules";
import { backlinksFromOffers, listOffersForViewer } from "@/lib/offers-data";
import { queryOffers } from "@/lib/offers-list";
import { queryLogs } from "@/lib/logs-data";
import { listPayments, paymentTotals } from "@/lib/payments-data";
import { listRealUserSites } from "@/lib/sites-data";
import { createClient } from "@/lib/supabase/server";
import type { LandingRow } from "@/components/landing/LandingMarkets";
import type { Category, UserSite } from "@/lib/types";

/**
 * Every list's data, built from its query string. The pages call these for the first render and
 * /api/lists/<name> calls the same functions for every change after that, so the two can't drift apart.
 */

const netPrice = (price: number, discountPct: number) => Math.round(price * (1 - discountPct / 100));

export async function loadLanding(sp: SP) {
  const { page, pageSize } = pageParams(sp);
  const sort = oneOf(sp, "sort", ["dr", "traffic", "price", "newest"] as const, "dr");
  const market = oneOf(sp, "market", ["all", "paid", "exchange", "abc"] as const, "all");
  const filters: MarketQuery = {
    q: str(sp, "q"),
    drMin: int(sp, "drMin", 0, 0, 100),
    drMax: int(sp, "drMax", 100, 0, 100),
    trafficMin: int(sp, "trafficMin", 0, 0),
    niches: csv(sp, "niches", niches).slice(0, 1),
    country: "all",
    categories: [],
    sort,
    dir: oneOf(sp, "dir", ["asc", "desc"] as const, defaultDir(sort)),
    priceMax: 0,
    page,
    pageSize,
  };
  const [result, counts] = await Promise.all([queryMarketSites(market, filters), publicMarketCounts()]);
  const rows: LandingRow[] = result.sites.map((s) => ({
    kind: "site",
    id: s.id,
    site: s,
    dr: s.dr,
    traffic: s.traffic,
    paidFrom: s.listings.length ? Math.min(...s.listings.map((l) => netPrice(l.price, l.discountPct))) : undefined,
  }));
  return { rows, total: result.total, page: result.page, pageSize, filters, market, counts };
}

export async function loadPaid(sp: SP) {
  const { page, pageSize } = pageParams(sp);
  const country = str(sp, "country");
  const sort = oneOf(sp, "sort", ["dr", "traffic", "price", "value", "newest"] as const, "dr");
  const filters: MarketQuery = {
    q: str(sp, "q"),
    drMin: int(sp, "drMin", 0, 0, 100),
    drMax: int(sp, "drMax", 100, 0, 100),
    trafficMin: int(sp, "trafficMin", 0, 0),
    niches: csv(sp, "niches", niches),
    country: (countries as readonly string[]).includes(country) ? country : "all",
    categories: csv<Category>(sp, "cats", categories),
    sort,
    dir: oneOf(sp, "dir", ["asc", "desc"] as const, defaultDir(sort)),
    priceMax: int(sp, "priceMax", 0, 0),
    page,
    pageSize,
  };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const result = await queryMarketSites("paid", filters, { excludeUserId: auth.user?.id });
  return { ...result, filters, pageSize };
}

export async function loadExchange(sp: SP) {
  const { page, pageSize } = pageParams(sp);
  const sort = oneOf(sp, "sort", ["dr", "traffic", "newest"] as const, "dr");
  const filters: MarketQuery = {
    q: str(sp, "q"),
    drMin: int(sp, "drMin", 0, 0, 100),
    drMax: int(sp, "drMax", 100, 0, 100),
    trafficMin: 0,
    niches: csv(sp, "niches", niches),
    country: "all",
    categories: [],
    sort,
    dir: oneOf(sp, "dir", ["asc", "desc"] as const, "desc"),
    priceMax: 0,
    page,
    pageSize,
  };
  const fitOnly = str(sp, "fit") === "1";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const mySites = (await listRealUserSites()).filter((s) => s.markets.includes("exchange") && s.status === "active");
  const result = await queryMarketSites("exchange", filters, {
    excludeUserId: auth.user?.id,
    derived: fitOnly ? { keep: (s) => exchangeFits(s, mySites) } : undefined,
  });
  // Which of the shown sites actually fit one of yours (for the button on each row)
  const fits = Object.fromEntries(result.sites.map((s) => [s.id, exchangeFits(s, mySites)]));
  return { ...result, filters, fitOnly, pageSize, fits, hasSites: mySites.length > 0 };
}

export async function loadAbc(sp: SP) {
  const { page, pageSize } = pageParams(sp);
  const filters = {
    tab: oneOf(sp, "tab", ["mine", "joined", "explore"] as const, "mine"),
    q: str(sp, "q"),
    status: oneOf(sp, "status", ["all", "open", "locked"] as const, "all"),
    page,
    pageSize,
  };
  const [board, mySites] = await Promise.all([getAbcBoard(filters), listRealUserSites()]);
  const abcSites = mySites.filter((s) => s.markets.includes("abc") && s.status === "active");
  // Can any of your sites take a seat there? The host accepts a DR / traffic range, like an Exchange listing.
  const roomFits: Record<string, boolean> = Object.fromEntries(
    board.rooms.map((r) => [
      r.id,
      abcSites.some(
        (s) =>
          // One seat per account in a pool
          !r.seats.some((x) => x.mine) &&
          !(r.host && rangeProblem(s, r.host.terms)) &&
          !(r.host && rangeProblem(r.host, s.exchangeTerms)),
      ),
    ]),
  );
  return { ...board, q: filters.q, status: filters.status, pageSize, mySites: abcSites, roomFits };
}

const SITE_SORT_KEYS = ["domain", "dr", "traffic", "added"] as const;
const SITE_SORT_COLUMN = { domain: "domain", dr: "dr", traffic: "traffic", added: "created_at" } as const;

export async function loadSites(sp: SP) {
  const { page, pageSize } = pageParams(sp, 10);
  const q = str(sp, "q");
  const status = oneOf(sp, "status", ["all", "active", "paused"] as const, "all");
  const market = oneOf(sp, "market", ["all", "paid", "exchange", "abc"] as const, "all");
  const sort = sortParams(sp, SITE_SORT_KEYS, "added", "desc");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const mine = () => supabase.from("sites").select("*", { count: "exact" }).eq("user_id", auth.user!.id).is("archived_at", null);
  const { count: totalAll } = await mine().limit(0);

  const run = (p: number) => {
    let qb = mine();
    if (q) qb = qb.ilike("domain", `%${likeTerm(q)}%`);
    if (status !== "all") qb = qb.eq("status", status);
    if (market !== "all") qb = qb.contains("markets", [market]);
    return qb
      .order(SITE_SORT_COLUMN[sort.key], { ascending: sort.dir === "asc" })
      .order("id")
      .range((p - 1) * pageSize, p * pageSize - 1);
  };
  const first = await run(page);
  const total = first.count ?? 0;
  const current = clampPage(page, total, pageSize);
  const rows = current === page ? first.data : (await run(current)).data;

  const sites: UserSite[] = (rows ?? []).map((r) => ({
    id: r.id,
    domain: r.domain,
    dr: r.dr,
    traffic: r.traffic,
    spamScore: r.spam_score,
    drChange30d: r.dr_change_30d,
    drCheckedAt: r.dr_checked_at ?? undefined,
    markets: r.markets,
    status: r.status,
    niches: r.niches,
    language: r.language,
    country: r.country,
    sitemapPageCount: r.sitemap_page_count,
    verifiedAt: r.verified_at ?? "",
    createdAt: r.created_at,
    categories: r.categories ?? [],
    exchangeTerms: r.exchange_terms,
  }));
  return { sites, total, totalAll: totalAll ?? 0, page: current, pageSize, q, status, market, sort };
}

export async function loadOffers(sp: SP) {
  const [offers, sites] = await Promise.all([listOffersForViewer(), listRealUserSites()]);
  return queryOffers(offers, sites, sp);
}

export async function loadBacklinks(sp: SP) {
  const offers = await listOffersForViewer();
  return { ...queryBacklinks(backlinksFromOffers(offers), sp), knownOfferIds: offers.map((o) => o.id) };
}

export async function loadPayments(sp: SP) {
  const { page, pageSize } = pageParams(sp, 10);
  const sort = sortParams(sp, ["date", "amount"] as const, "date", "desc");
  const [list, totals] = await Promise.all([listPayments(sort, page, pageSize), paymentTotals()]);
  return { ...list, totals, sort, pageSize };
}

export const loadLogs = (sp: SP) => queryLogs(sp);

export const LOADERS = {
  landing: { load: loadLanding, public: true },
  paid: { load: loadPaid, public: false },
  exchange: { load: loadExchange, public: false },
  abc: { load: loadAbc, public: false },
  sites: { load: loadSites, public: false },
  offers: { load: loadOffers, public: false },
  backlinks: { load: loadBacklinks, public: false },
  payments: { load: loadPayments, public: false },
  logs: { load: loadLogs, public: false },
} as const;

export type ListName = keyof typeof LOADERS;
