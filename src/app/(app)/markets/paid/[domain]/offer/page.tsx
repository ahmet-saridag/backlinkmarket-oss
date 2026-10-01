import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MarketSiteHero } from "@/components/markets/MarketSiteHero";
import { PaidOfferWizard } from "@/components/offers/PaidOfferWizard";
import { PageHeader } from "@/components/shared/PageHeader";
import { domainOfListedSite, getRealMarketSite } from "@/lib/market-data";
import { domainFromParam, isUuid } from "@/lib/domain";
import { offerLimits } from "@/lib/market-rules";
import { checkSitemap } from "@/lib/site-verification";
import { listRealUserSites } from "@/lib/sites-data";
import { createClient } from "@/lib/supabase/server";
import type { ConditionCheck, MarketSite, UserSite } from "@/lib/types";

export const metadata: Metadata = { title: "Make Offer · Paid Market · Backlink Market" };

const OPEN_STATUSES = ["SENT", "ACCEPTED", "PAYMENT_RECEIVED", "DELIVERED"];

/** Seller requirements plus your open-offer limits, read from the offers table. */
async function checksFor(site: MarketSite, mySites: UserSite[]): Promise<Record<string, ConditionCheck[]>> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: open } = await supabase
    .from("offers")
    .select("buyer_site_id, seller_site_id")
    .eq("buyer_user_id", auth.user!.id)
    .in("status", OPEN_STATUSES);
  const openOffers = open ?? [];

  return Object.fromEntries(
    mySites.map((u) => {
      const existing = openOffers.some((o) => o.buyer_site_id === u.id && o.seller_site_id === site.id);
      return [
        u.id,
        [
          { label: "Your site is active", passed: u.status === "active", detail: u.status === "active" ? "Active" : "Resume it in My Sites first" },
          {
            label: "Concurrent open offer limit",
            passed: openOffers.length < offerLimits.max,
            detail: `Now: ${openOffers.length}/${offerLimits.max}`,
          },
          {
            label: "No open offer with this site",
            passed: !existing,
            detail: existing ? "You already have an open offer for this site" : "None (first offer)",
          },
        ],
      ];
    }),
  );
}

export default async function PaidOfferPage({ params }: PageProps<"/markets/paid/[domain]/offer">) {
  const { domain: param } = await params;
  if (isUuid(param)) {
    const d = await domainOfListedSite(param);
    if (d) redirect(`/markets/paid/${d}/offer`);
    notFound();
  }
  const site = await getRealMarketSite(domainFromParam(param), "paid");
  if (!site) notFound();

  const mySites = await listRealUserSites();
  const [checksBySite, sitemap] = await Promise.all([checksFor(site, mySites), checkSitemap(site.domain)]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Make an offer"
        description="Pick the site the link is for, choose categories, write the brief. You pay the seller directly once they accept."
        back={{ href: "/markets/paid", label: "Paid Market" }}
      />
      <MarketSiteHero site={site} />
      <PaidOfferWizard site={site} mySites={mySites} checksBySite={checksBySite} sitemapPages={sitemap.pages} />
    </div>
  );
}
