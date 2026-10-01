import type { OfferBriefLine } from "@/lib/types";

/** One link that should exist for an offer: where to look for it, and what it must be. */
export interface ExpectedLink {
  /** Which ordered line it belongs to */
  category: OfferBriefLine["category"];
  /** The page it should be on; null until the seller says where (an article, a review) */
  pageUrl: string | null;
  targetUrl: string;
  anchor: string;
  /** An extra dofollow link on top of the ordered one */
  extra?: boolean;
}

/** A line whose page we already know from the order (a chosen page, the site-wide footer) needs no URL from the seller. */
export function knownPage(line: OfferBriefLine, sellerDomain: string): string | null {
  if (line.category === "footer_link") return `https://${sellerDomain}/`;
  if (line.category === "link_insertion" && line.sellerPage) return line.sellerPage;
  return null;
}

/** A Link Insertion on "any page" needs nothing from the seller: we find it on their site. The seller has to tell us where they published it: an article or review we couldn't know, or a page nobody picked. */
export const needsUrl = (line: OfferBriefLine, sellerDomain: string) => line.category !== "link_insertion" && knownPage(line, sellerDomain) === null;

/**
 * Every link an offer should end up with, from its brief and the URLs the seller gave for lines that needed one.
 * `buyerDomain` is the target for a review, whose brief names a product rather than a page.
 */
export function expectedLinks(brief: OfferBriefLine[], sellerDomain: string, buyerDomain: string, deliveries: Record<string, string>): ExpectedLink[] {
  const out: ExpectedLink[] = [];
  for (const line of brief) {
    const pageUrl = knownPage(line, sellerDomain) ?? deliveries[line.category] ?? null;
    out.push({
      category: line.category,
      pageUrl,
      targetUrl: line.targetUrl || `https://${buyerDomain}/`,
      anchor: line.category === "review" ? "" : (line.anchor ?? ""),
    });
    for (const e of line.extras ?? []) out.push({ category: line.category, pageUrl, targetUrl: e.url, anchor: e.anchor, extra: true });
  }
  return out;
}

/** A placement with no term ("forever") is finished the moment it's verified live; a timed one runs until the term ends. */
export const isPermanent = (brief: OfferBriefLine[]) => brief.length > 0 && brief.every((l) => l.duration === "forever");
