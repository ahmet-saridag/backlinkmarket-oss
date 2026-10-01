import type { Metadata } from "next";
import { PaidMarketView } from "@/components/markets/PaidMarketView";
import { PageHeader } from "@/components/shared/PageHeader";
import { loadPaid } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "Paid Market · Backlink Market" };

export default async function PaidMarketPage({ searchParams }: PageProps<"/markets/paid">) {
  const props = await loadPaid((await searchParams) as SP);
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader title="Paid Market" description="Buy placements on verified sites. Pay the seller directly — wire, PayPal, USDT or bank transfer." />
      <PaidMarketView {...props} />
    </div>
  );
}
