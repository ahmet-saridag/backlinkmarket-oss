import type { Metadata } from "next";
import { OffersView } from "@/components/offers/OffersView";
import { PageHeader } from "@/components/shared/PageHeader";
import { loadOffers } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "Offers · Backlink Market" };

export default async function OffersPage({ searchParams }: PageProps<"/offers">) {
  const props = await loadOffers((await searchParams) as SP);
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader title="Offers" description="Every offer you've sent or received, organised by your sites — what needs you comes first." />
      <OffersView {...props} />
    </div>
  );
}
