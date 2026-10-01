import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/landing/public-ui";
import { listPublicListings } from "@/lib/market-data";
import { displayTraffic } from "@/lib/traffic-ranges";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sitemap · Backlink Market",
  description: "Every public page and listing on Backlink Market.",
  alternates: { canonical: "/sitemap" },
};

/** Human-readable sitemap: a crawlable page that links to every listing, so they're found by following links and not only through the XML file. */
export default async function SitemapPage() {
  const listings = await listPublicListings().catch(() => []);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 md:px-6">
      <PublicHeader />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">Sitemap</h1>
        <p className="text-sm text-muted-foreground">Every public page and listing on Backlink Market.</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Pages</h2>
        <ul className="flex flex-col gap-1 text-[15px]">
          <li>
            <Link href="/" className="underline-offset-2 hover:underline">
              Marketplace — browse all listings
            </Link>
          </li>
          <li>
            <Link href="/seller-rules" className="underline-offset-2 hover:underline">
              Seller Rules
            </Link>
          </li>
          <li>
            <Link href="/buyer-rules" className="underline-offset-2 hover:underline">
              Buyer Rules
            </Link>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Listings ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No listings yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[15px]">
            {listings.map((s) => (
              <li key={s.id}>
                <Link href={`/listing/${s.domain}`} className="underline-offset-2 hover:underline">
                  {s.domain}
                </Link>{" "}
                <span className="text-sm text-muted-foreground">
                  · DR {s.dr} · {displayTraffic(s.traffic)} visits/mo · {s.niches.slice(0, 2).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
