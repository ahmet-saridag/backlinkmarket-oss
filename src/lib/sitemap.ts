const FETCH_TIMEOUT_MS = 8_000;

const SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml"];

export interface SitemapResult {
  found: boolean;
  url?: string;
  /** Page URLs to pick from (the first PAGE_LIST_MAX) */
  pages: string[];
  /** How many pages the sitemap lists in all */
  total: number;
}

const PAGE_LIST_MAX = 3000;
const SITEMAP_CHILDREN_MAX = 25;

const locs = (xml: string) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

async function sitemapBody(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) return null;
    const body = await res.text();
    return /<urlset|<sitemapindex/i.test(body) ? body : null;
  } catch {
    return null;
  }
}

/** A sitemap index may only point to sitemaps on the same site — never at an address of someone else's choosing. */
const sameSite = (url: string, domain: string) => {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    const d = domain.toLowerCase().replace(/^www\./, "");
    return (u.protocol === "https:" || u.protocol === "http:") && (h === d || h.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

/**
 * Reads the site's sitemap and lists its pages. A sitemap index (a sitemap of sitemaps, what most blogs and shops have)
 * is followed one level down, so the list is pages — not a handful of other sitemap files.
 */
export async function checkSitemap(domain: string): Promise<SitemapResult> {
  for (const path of SITEMAP_PATHS) {
    const url = `https://${domain}${path}`;
    const body = await sitemapBody(url);
    if (!body) continue;
    let entries = locs(body);
    if (/<sitemapindex/i.test(body)) {
      const children = entries.filter((u) => sameSite(u, domain)).slice(0, SITEMAP_CHILDREN_MAX);
      const bodies = await Promise.all(children.map(sitemapBody));
      entries = bodies.flatMap((b) => (b && !/<sitemapindex/i.test(b) ? locs(b) : []));
    }
    const pages = [...new Set(entries)].filter((u) => !/\.xml(\.gz)?$/i.test(u) && sameSite(u, domain));
    return { found: true, url, pages: pages.slice(0, PAGE_LIST_MAX), total: pages.length };
  }
  return { found: false, pages: [], total: 0 };
}
