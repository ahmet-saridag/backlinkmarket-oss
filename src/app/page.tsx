import type { Metadata } from "next";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingMarkets } from "@/components/landing/LandingMarkets";
import { PublicFooter } from "@/components/landing/PublicFooter";
import { JsonLd } from "@/components/shared/JsonLd";
import { listingsItemListJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { loadLanding } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = {
  title: "Backlink Market — buy backlinks from verified sites",
  description: "Browse verified sites selling backlink placements — filter by Domain Rating, traffic, niche and price. Pay the seller directly, no escrow.",
  alternates: { canonical: "/" },
};

// Listings change as sellers add sites; never serve a stale copy.
export const dynamic = "force-dynamic";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const props = await loadLanding((await searchParams) as SP);
  return (
    <>
      <main className="mx-auto flex w-full max-w-[1400px] flex-col px-3 md:px-6">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), listingsItemListJsonLd(props.rows.map((r) => r.site))]} />
        <LandingMarkets {...props} />
        <HowItWorks />
      </main>
      <PublicFooter />
    </>
  );
}
