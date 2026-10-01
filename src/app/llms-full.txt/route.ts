import { NextResponse } from "next/server";
import { ABOUT, intro, listingSection } from "@/lib/llms-content";
import { listPublicListings } from "@/lib/market-data";

export const dynamic = "force-dynamic";

// Everything an LLM needs to answer questions about the marketplace and its listings, in one file.
export async function GET() {
  let listings: Awaited<ReturnType<typeof listPublicListings>> = [];
  try {
    listings = await listPublicListings(500);
  } catch (error) {
    console.error("llms-full.txt: listings unavailable", error);
  }
  const content = `${intro("## About")}

${ABOUT}

## How a Paid Market deal works

1. The buyer picks a site, chooses the categories they want and briefs the seller (target page and anchor text). The price comes from the seller's listing — buyers can't name their own.
2. The seller accepts. The buyer then sees the seller's payout details (wire, PayPal, USDT or bank transfer) and pays them directly.
3. The buyer marks the payment as sent; the seller confirms it arrived.
4. The seller publishes the link and submits the live URL. Backlink Market loads the page and checks the link is there, dofollow and uses the agreed anchor.
5. From then on the link is monitored. If it disappears the seller has 7 days to restore it before it counts against their standing.

## Listings

${listings.length ? listings.map(listingSection).join("\n\n") : "No listings yet."}
`;
  return new NextResponse(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
