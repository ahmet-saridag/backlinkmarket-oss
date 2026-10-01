import "server-only";
import { checkLinksOnPage, type LinkFailure, type PageCache } from "@/lib/link-check";
import { checkSitemap } from "@/lib/site-verification";
import { categoryLabels } from "@/lib/labels";
import { expectedLinks } from "@/lib/expected-links";
import type { LinkStatus, OfferBriefLine } from "@/lib/types";

export interface LinkProblem {
  label: string;
  reason: string;
}

export interface OfferLinkCheck {
  ok: boolean;
  /** Everything at once: live only if every link is, dofollow only if every link is */
  status: LinkStatus;
  problems: LinkProblem[];
  /** The worst thing found: a real failure beats "couldn't reach the page", which never counts against the seller */
  outcome: "ok" | LinkFailure;
  /** Pages we found the links on by looking, for lines nobody named a page for (category -> page URL) */
  discovered: Record<string, string>;
}

const SCAN_LIMIT = 40;

/** Nobody said which page the link is on: look at the homepage and the sitemap's pages until one links to the buyer. */
async function discoverPage(sellerDomain: string, wanted: { targetUrl: string; anchor: string }): Promise<{ page: string | null; scanned: number }> {
  const sitemap = await checkSitemap(sellerDomain).catch(() => ({ pages: [] as string[] }));
  const candidates = [...new Set([`https://${sellerDomain}/`, ...sitemap.pages])].slice(0, SCAN_LIMIT);
  let scanned = 0;
  for (let i = 0; i < candidates.length; i += 8) {
    const batch = candidates.slice(i, i + 8);
    const results = await Promise.all(batch.map((page) => checkLinksOnPage(page, [wanted]).then(([r]) => ({ page, r }))));
    scanned += batch.length;
    const hit = results.find(({ r }) => r.ok) ?? results.find(({ r }) => r.status.live);
    if (hit) return { page: hit.page, scanned };
  }
  return { page: null, scanned };
}

/** Loads each page the offer's links should be on (once) and checks every ordered and extra link on it. */
export async function checkOfferLinks(input: {
  brief: OfferBriefLine[];
  sellerDomain: string;
  buyerDomain: string;
  deliveries: Record<string, string>;
  /** Share one set of page fetches across many offers (the scan worker) */
  cache?: PageCache;
}): Promise<OfferLinkCheck> {
  const expected = expectedLinks(input.brief, input.sellerDomain, input.buyerDomain, input.deliveries);
  const discovered: Record<string, string> = {};
  const unsearched: string[] = [];
  for (const e of expected.filter((x) => !x.pageUrl && !x.extra)) {
    if (e.category === "review") continue;
    const { page, scanned } = await discoverPage(input.sellerDomain, e);
    if (page) {
      discovered[e.category] = page;
      for (const x of expected) if (x.category === e.category && !x.pageUrl) x.pageUrl = page;
    } else unsearched.push(`${categoryLabels[e.category]}: “${e.anchor || e.targetUrl}” — we looked at ${scanned} page${scanned === 1 ? "" : "s"} of ${input.sellerDomain} (the homepage and its sitemap) and found no link to ${e.targetUrl}.`);
  }
  const now = new Date().toISOString();
  const problems: LinkProblem[] = [];
  let live = true;
  let dofollow = true;
  let anchorMatches = true;
  const kinds = new Set<LinkFailure>();

  const byPage = new Map<string, typeof expected>();
  for (const e of expected) {
    const label = `${categoryLabels[e.category]}${e.extra ? " (extra link)" : ""}: “${e.anchor || e.targetUrl}”`;
    if (!e.pageUrl) {
      problems.push({ label, reason: unsearched.find((u) => u.startsWith(`${categoryLabels[e.category]}:`)) ?? "We don't know which page it's on yet." });
      live = false;
      continue;
    }
    byPage.set(e.pageUrl, [...(byPage.get(e.pageUrl) ?? []), e]);
  }

  await Promise.all(
    [...byPage.entries()].map(async ([page, links]) => {
      const results = await checkLinksOnPage(page, links, input.cache);
      results.forEach((r, i) => {
        if (r.ok) return;
        kinds.add(r.kind ?? "missing");
        const e = links[i];
        problems.push({ label: `${categoryLabels[e.category]}${e.extra ? " (extra link)" : ""}: “${e.anchor || e.targetUrl}” on ${page}`, reason: r.reason ?? "The link isn't right." });
        if (!r.status.live) live = false;
        if (!r.status.dofollow) dofollow = false;
        if (!r.status.anchorMatches) anchorMatches = false;
      });
    }),
  );

  const outcome: OfferLinkCheck["outcome"] =
    problems.length === 0 ? "ok" : (["missing", "nofollow", "anchor_changed"] as const).find((k) => kinds.has(k)) ?? (kinds.has("unreachable") ? "unreachable" : "missing");
  return { ok: problems.length === 0, outcome, status: { live, dofollow: live && dofollow, anchorMatches: live && anchorMatches, lastScan: now }, problems, discovered };
}
