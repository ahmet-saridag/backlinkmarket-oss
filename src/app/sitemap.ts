import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";
import { listPublicListings } from "@/lib/market-data";

// Listings change as sellers add sites; generate per request so a new site is in the sitemap right away.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let listings: Awaited<ReturnType<typeof listPublicListings>> = [];
  try {
    listings = await listPublicListings();
  } catch (error) {
    console.error("sitemap: listings unavailable, emitting static URLs only", error);
  }
  return [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/sitemap`, lastModified: new Date(), changeFrequency: "daily", priority: 0.3 },
    { url: `${APP_URL}/seller-rules`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${APP_URL}/buyer-rules`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    ...listings.map((s) => ({
      url: `${APP_URL}/listing/${s.domain}`,
      lastModified: s.listedAt ? new Date(s.listedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
