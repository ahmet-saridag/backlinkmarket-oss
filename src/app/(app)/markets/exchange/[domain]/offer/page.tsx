import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExchangeOfferForm } from "@/components/offers/ExchangeOfferForm";
import { MarketSiteHero } from "@/components/markets/MarketSiteHero";
import { PageHeader } from "@/components/shared/PageHeader";
import { domainOfListedSite, getRealMarketSite } from "@/lib/market-data";
import { domainFromParam, isUuid } from "@/lib/domain";
import { checkSitemap } from "@/lib/site-verification";
import { listRealUserSites } from "@/lib/sites-data";

export const metadata: Metadata = { title: "Propose swap · Exchange · Backlink Market" };

export default async function ExchangeOfferPage({ params }: PageProps<"/markets/exchange/[domain]/offer">) {
  const { domain: param } = await params;
  if (isUuid(param)) {
    const d = await domainOfListedSite(param);
    if (d) redirect(`/markets/exchange/${d}/offer`);
    notFound();
  }
  const site = await getRealMarketSite(domainFromParam(param), "exchange");
  if (!site) notFound();
  const [mySitesAll, theirSitemap] = await Promise.all([listRealUserSites(), checkSitemap(site.domain)]);
  const mySites = mySitesAll.filter((s) => s.markets.includes("exchange") && s.status === "active");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Propose a swap"
        description="A link swap: you get a link on their site, they get one on yours. Nothing is paid."
        back={{ href: "/markets/exchange", label: "Exchange" }}
      />
      <MarketSiteHero site={site} />
      <ExchangeOfferForm site={site} mySites={mySites} theirPages={theirSitemap.pages} />
    </div>
  );
}
