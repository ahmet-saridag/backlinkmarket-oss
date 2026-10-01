import { NextResponse } from "next/server";
import { APP_URL, SITE_DESCRIPTION } from "@/lib/app-url";
import { ABOUT, listingLine } from "@/lib/llms-content";
import { listPublicListings } from "@/lib/market-data";

// Per request, for the reason written out in sitemap.ts: a new listing should be visible to crawlers at once.
export const dynamic = "force-dynamic";

// A condensed markdown summary of the site for LLM crawlers — the emerging llms.txt convention.
export async function GET() {
  let listings: Awaited<ReturnType<typeof listPublicListings>> = [];
  try {
    listings = await listPublicListings(200);
  } catch (error) {
    console.error("llms.txt: listings unavailable", error);
  }

  const content = `# Backlink Market

> ${SITE_DESCRIPTION}

## About

${ABOUT}

## Product

- [Marketplace](${APP_URL}): Browse every Paid Market listing — filter by Domain Rating, traffic, niche and price
- [Seller Rules](${APP_URL}/seller-rules): What sellers agree to — ownership, honest numbers, direct payment, 72-hour delivery, links that stay live
- [Buyer Rules](${APP_URL}/buyer-rules): What buyers agree to — own sites, clear briefs, paying the seller directly, checking the delivery
- [Sitemap](${APP_URL}/sitemap): Every public page in one list

## Listings for sale

${listings.length ? listings.map(listingLine).join("\n") : "- No listings yet."}

## Optional

- [Full listing details](${APP_URL}/llms-full.txt): Every listing with its placements, prices and requirements in one file
- [XML sitemap](${APP_URL}/sitemap.xml)
- [AI usage permissions](${APP_URL}/ai.txt)
`;
  return new NextResponse(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
