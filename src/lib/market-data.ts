import "server-only";
import { createClient } from "@/lib/supabase/server";
import { priceFor } from "@/lib/market-price";
import type { Category, MarketSite, MarketType, Seller, SiteCategoryConfig } from "@/lib/types";

type SiteRow = {
  id: string;
  user_id: string;
  domain: string;
  dr: number;
  traffic: number;
  spam_score: number;
  markets: string[];
  niches: string[];
  language: string;
  country: string;
  sitemap_page_count: number;
  verified_at: string | null;
  created_at: string;
  categories: unknown;
  exchange_terms: unknown;
};

type ExchangeTermsJson = {
  drMin: number;
  drMax: number;
  trafficMin?: number;
  trafficMax?: number | null;
  multiLinkCompensation: boolean;
  wantedPage?: string;
  wantedAnchor?: string;
  specifyPages: boolean;
  slots: MarketSite["exchangeSlots"];
  generalCapacity: MarketSite["generalCapacity"];
} | null;

/** A real site as the marketplace shows it. Sellers don't configure requirements yet, so buyers get permissive defaults. */
function toMarketSite(row: SiteRow, seller: Seller | undefined): MarketSite {
  const categories = (Array.isArray(row.categories) ? row.categories : []) as SiteCategoryConfig[];
  const terms = row.exchange_terms as ExchangeTermsJson;
  return {
    id: row.id,
    domain: row.domain,
    seller,
    listedAt: row.created_at,
    dr: row.dr,
    traffic: row.traffic,
    spamScore: row.spam_score,
    niches: row.niches,
    language: row.language,
    country: row.country,
    // No deal history yet on a new account
    // Real numbers: links live or done, and the share that went right
    reputation: seller && seller.deals + seller.failedDeals > 0 ? Math.round((100 * seller.deals) / (seller.deals + seller.failedDeals)) : 100,
    completedDeals: seller?.deals ?? 0,
    fastResponder: false,
    markets: row.markets as MarketType[],
    listings: categories.map((c) => ({
      category: c.category,
      price: c.price,
      duration: c.duration,
      dofollowFee: c.dofollowFee,
      discountPct: c.discountPct,
      requirements: c.notes ? [c.notes] : [],
      pages: c.pages,
      minWords: c.minWords,
      maxWords: c.maxWords,
      aiPolicy: c.aiPolicy,
      reviewProcess: c.reviewProcess,
    })),
    requirements: {
      minDr: 0,
      minTraffic: 0,
      niches: row.niches,
      bannedContent: ["Casino", "CBD", "Adult"],
      maxConcurrentOffers: 3,
    },
    acceptedDr: [terms?.drMin ?? 0, terms?.drMax ?? 100],
    acceptedTraffic: [terms?.trafficMin ?? 0, terms?.trafficMax ?? null],
    multiLinkCompensation: terms?.multiLinkCompensation ?? false,
    wantedPage: terms?.wantedPage || undefined,
    wantedAnchor: terms?.wantedAnchor || undefined,
    specifyPages: terms?.specifyPages ?? false,
    exchangeSlots: terms?.slots ?? [],
    generalCapacity: terms?.generalCapacity ?? null,
    sitemapPageCount: row.sitemap_page_count,
  };
}

export async function sellersById(userIds: string[]): Promise<Map<string, Seller>> {
  const map = new Map<string, Seller>();
  if (!userIds.length) return map;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_market_sellers", { seller_ids: [...new Set(userIds)] });
  for (const s of data ?? []) {
    map.set(s.id, {
      name: s.full_name ?? "Seller",
      // Every account's photo lives at a fixed public path; sellers without one fall back to initials.
      // The profile's own photo URL once it lives in our storage (it carries a version, so a new photo shows at once); before that, the fixed path.
      avatarUrl: (s.avatar_url as string | null)?.includes("/storage/v1/object/public/avatars/")
        ? (s.avatar_url as string)
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${s.id}/avatar.jpg`,
      memberSince: new Date(s.member_since).toISOString().slice(0, 7),
      verified: true,
      payoutMethod: (s.payout_method as Seller["payoutMethod"]) ?? undefined,
      payoutNetwork: s.payout_network ?? undefined,
      deals: s.deals ?? 0,
      failedDeals: s.failed_deals ?? 0,
    });
  }
  return map;
}

async function listMarketSites(market: MarketType, excludeUserId?: string): Promise<MarketSite[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sites")
    .select("*")
    .contains("markets", [market])
    .eq("status", "active")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (excludeUserId) query = query.neq("user_id", excludeUserId);
  const { data: rows } = await query;
  const sites = (rows ?? []) as SiteRow[];
  const sellers = await sellersById(sites.map((s) => s.user_id));
  return sites.map((s) => toMarketSite(s, sellers.get(s.user_id)));
}

/** Real sites listed in a market, from other accounts — your own sites never show up as sellers. */
export async function getRealMarketSites(market: MarketType): Promise<MarketSite[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  return listMarketSites(market, auth.user.id);
}

/** Everything listed in a market, for signed-out visitors browsing the public market. */
export const getPublicMarketSites = (market: MarketType) => listMarketSites(market);

export async function getRealMarketSite(domain: string, market: MarketType): Promise<MarketSite | undefined> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return undefined;
  const { data: row } = await supabase
    .from("sites")
    .select("*")
    .eq("domain", domain)
    .contains("markets", [market])
    .eq("status", "active")
    .is("archived_at", null)
    .neq("user_id", auth.user.id)
    .maybeSingle();
  if (!row) return undefined;
  const sellers = await sellersById([row.user_id]);
  return toMarketSite(row as SiteRow, sellers.get(row.user_id));
}

/** One listing for the public listing page (signed-out visitors included). */
export async function getPublicMarketSite(domain: string, market: MarketType | "all"): Promise<MarketSite | undefined> {
  const supabase = await createClient();
  let qb = supabase.from("sites").select("*").eq("domain", domain).eq("status", "active").is("archived_at", null);
  qb = market === "all" ? qb.overlaps("markets", ["paid", "exchange", "abc"]) : qb.contains("markets", [market]);
  const { data: row } = await qb.maybeSingle();
  if (!row) return undefined;
  const sellers = await sellersById([row.user_id]);
  return toMarketSite(row as SiteRow, sellers.get(row.user_id));
}

/** The other listed sites of the account behind a domain (for "more from this owner" on a public listing). */
export async function getOwnerOtherSites(domain: string): Promise<MarketSite[]> {
  const supabase = await createClient();
  const { data: self } = await supabase.from("sites").select("user_id").eq("domain", domain).is("archived_at", null).maybeSingle();
  if (!self) return [];
  const { data: rows } = await supabase
    .from("sites")
    .select("*")
    .eq("user_id", self.user_id)
    .neq("domain", domain)
    .eq("status", "active")
    .is("archived_at", null)
    .overlaps("markets", ["paid", "exchange", "abc"])
    .order("dr", { ascending: false })
    .limit(24);
  return ((rows ?? []) as SiteRow[]).map((r) => toMarketSite(r, undefined));
}

/* ---------- searching, filtering, sorting and paging happen here, not in the browser ---------- */

export interface MarketQuery {
  q: string;
  drMin: number;
  drMax: number;
  trafficMin: number;
  niches: string[];
  country: string;
  categories: Category[];
  sort: "dr" | "traffic" | "newest" | "price" | "value";
  dir: "asc" | "desc";
  priceMax: number;
  page: number;
  pageSize: number;
}

export interface MarketPage {
  sites: MarketSite[];
  /** Sites matching the filters */
  total: number;
  /** Sites in the market before any filter */
  totalAll: number;
  page: number;
}

/** Price is naturally cheapest-first; everything else best-first. */
export const defaultDir = (sort: MarketQuery["sort"]): MarketQuery["dir"] => (sort === "price" ? "asc" : "desc");

const DB_SORT = { dr: "dr", traffic: "traffic", newest: "created_at" } as const;
/** Ceiling on rows pulled into memory when a derived value (price, fit) has to be computed per site. */
const IN_MEMORY_LIMIT = 3000;

/**
 * One page of a market. Everything the database can filter (domain / seller name, DR, traffic, niche,
 * country, category) and sort (DR, traffic, newest) it does; price and "fit" are derived per site, so
 * those go through `derived` on the matching rows before paging.
 */
export async function queryMarketSites(
  market: MarketType | "all",
  f: MarketQuery,
  opts: { excludeUserId?: string; derived?: { keep?: (s: MarketSite) => boolean; compare?: (a: MarketSite, b: MarketSite) => number } } = {},
): Promise<MarketPage> {
  const supabase = await createClient();
  const like = f.q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ").trim();
  const sellerIds = like ? (((await supabase.rpc("search_market_seller_ids", { p_query: f.q })).data as string[] | null) ?? []) : [];

  const NO_USER = "00000000-0000-0000-0000-000000000000";
  const list = (withFilters: boolean) => {
    let qb = supabase
      .from("sites")
      .select("*", { count: "exact" })
      .eq("status", "active")
      .is("archived_at", null)
      .neq("user_id", opts.excludeUserId ?? NO_USER);
    qb = market === "all" ? qb.overlaps("markets", ["paid", "exchange", "abc"]) : qb.contains("markets", [market]);
    if (!withFilters) return qb;
    if (like) qb = qb.or(`domain.ilike.%${like}%${sellerIds.length ? `,user_id.in.(${sellerIds.join(",")})` : ""}`);
    if (f.drMin > 0) qb = qb.gte("dr", f.drMin);
    if (f.drMax < 100) qb = qb.lte("dr", f.drMax);
    if (f.trafficMin > 0) qb = qb.gte("traffic", f.trafficMin);
    if (f.niches.length) qb = qb.overlaps("niches", f.niches);
    if (f.country !== "all") qb = qb.eq("country", f.country);
    if (f.categories.length) qb = qb.or(f.categories.map((c) => `categories.cs.[{"category":"${c}"}]`).join(","));
    return qb;
  };

  const { count: totalAll } = await list(false).limit(0);
  const derived = opts.derived;
  const priceSort = f.sort === "price" || f.sort === "value";
  const inMemory = !!derived || f.priceMax > 0 || priceSort;

  const toSites = async (rows: SiteRow[]) => {
    const sellers = await sellersById(rows.map((r) => r.user_id));
    return rows.map((r) => toMarketSite(r, sellers.get(r.user_id)));
  };

  if (!inMemory) {
    const sortCol = DB_SORT[f.sort as keyof typeof DB_SORT];
    const run = (page: number) =>
      list(true)
        .order(sortCol, { ascending: f.dir === "asc" })
        .order("id")
        .range((page - 1) * f.pageSize, page * f.pageSize - 1);
    const first = await run(f.page);
    let data = first.data;
    const total = first.count ?? 0;
    const page = Math.min(f.page, Math.max(1, Math.ceil(total / f.pageSize)));
    if (page !== f.page) data = (await run(page)).data;
    return { sites: await toSites((data ?? []) as SiteRow[]), total, totalAll: totalAll ?? 0, page };
  }

  const { data } = await list(true)
    .order("dr", { ascending: false })
    .limit(IN_MEMORY_LIMIT);
  let sites = await toSites((data ?? []) as SiteRow[]);
  if (f.priceMax > 0) sites = sites.filter((s) => priceFor(s, f.categories) <= f.priceMax);
  if (derived?.keep) sites = sites.filter(derived.keep);
  const by: Record<MarketQuery["sort"], (a: MarketSite, b: MarketSite) => number> = {
    dr: (a, b) => b.dr - a.dr || b.traffic - a.traffic,
    traffic: (a, b) => b.traffic - a.traffic,
    newest: (a, b) => (b.listedAt ?? "").localeCompare(a.listedAt ?? ""),
    price: (a, b) => priceFor(a, f.categories) - priceFor(b, f.categories),
    value: (a, b) => b.dr / priceFor(b, f.categories) - a.dr / priceFor(a, f.categories),
  };
  const sign = f.dir === defaultDir(f.sort) ? 1 : -1;
  const compare = derived?.compare ?? by[f.sort];
  // The comparators above are in each sort's natural direction; the other direction flips them
  sites.sort((a, b) => sign * compare(a, b));
  const total = sites.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / f.pageSize)));
  return { sites: sites.slice((page - 1) * f.pageSize, page * f.pageSize), total, totalAll: totalAll ?? 0, page };
}

/** Everything listed in any market, newest first — for the sitemap, llms.txt and other crawler-facing files. */
export async function listPublicListings(limit = 1000): Promise<MarketSite[]> {
  const { sites } = await queryMarketSites("all", {
    q: "",
    drMin: 0,
    drMax: 100,
    trafficMin: 0,
    niches: [],
    country: "all",
    categories: [],
    sort: "newest",
    dir: "desc",
    priceMax: 0,
    page: 1,
    pageSize: limit,
  });
  return sites;
}

/** The domain behind an old uuid link to a listed site, so it can redirect to the domain-based address. */
export async function domainOfListedSite(id: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("domain").eq("id", id).is("archived_at", null).maybeSingle();
  return data?.domain ?? undefined;
}

/** How many listed sites each market tab has (public counts for the landing page). */
export async function publicMarketCounts(): Promise<Record<MarketType | "all", number>> {
  const supabase = await createClient();
  const count = async (market: MarketType | "all") => {
    let qb = supabase.from("sites").select("id", { count: "exact", head: true }).eq("status", "active").is("archived_at", null);
    qb = market === "all" ? qb.overlaps("markets", ["paid", "exchange", "abc"]) : qb.contains("markets", [market]);
    return (await qb).count ?? 0;
  };
  const [all, paid, exchange, abc] = await Promise.all([count("all"), count("paid"), count("exchange"), count("abc")]);
  return { all, paid, exchange, abc };
}
