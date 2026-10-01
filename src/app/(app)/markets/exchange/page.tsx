import type { Metadata } from "next";
import { ExchangeMarketView } from "@/components/markets/ExchangeMarketView";
import { PageHeader } from "@/components/shared/PageHeader";
import { loadExchange } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "Exchange · Backlink Market" };

export default async function ExchangePage({ searchParams }: PageProps<"/markets/exchange">) {
  const props = await loadExchange((await searchParams) as SP);
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader title="Exchange" description="Swap links 1:1 with other sites — no money involved. You place a link on theirs, they place one on yours." />
      <ExchangeMarketView {...props} />
    </div>
  );
}
