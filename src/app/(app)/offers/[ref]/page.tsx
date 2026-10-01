import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferDetail } from "@/components/offers/OfferDetail";
import { PageHeader } from "@/components/shared/PageHeader";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { isUuid } from "@/lib/domain";
import { getOfferForViewer, refOfOfferId } from "@/lib/offers-data";
import { createClient } from "@/lib/supabase/server";
import type { PayoutDetails } from "@/lib/types";

// A delivery is checked in the background right after the response; give it room
export const maxDuration = 60;

export const metadata: Metadata = { title: "Offer · Backlink Market" };

export default async function OfferDetailPage({ params }: PageProps<"/offers/[ref]">) {
  const { ref: param } = await params;
  // Old links used the uuid: send them to the short address
  if (isUuid(param)) {
    const ref = await refOfOfferId(param);
    if (ref) redirect(`/offers/${ref}`);
    notFound();
  }
  const offer = await getOfferForViewer(param);
  if (!offer) notFound();

  // Only the buyer of an accepted Paid Market offer gets the seller's payout details (the function checks that too).
  let payout: PayoutDetails | null = null;
  if (offer.type === "paid" && offer.direction === "sent" && offer.status !== "SENT") {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_offer_payout", { p_offer_id: offer.id });
    const row = data?.[0];
    if (row) payout = { method: row.method, accountHolder: row.account_holder ?? undefined, network: row.network ?? undefined, address: row.address };
  }

  // The payment proof is a private file: a link that works for an hour, made for someone who is part of this offer
  let proofUrl: string | null = null;
  if (offer.paymentProofPath) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(offer.paymentProofPath, 3600);
    proofUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <SiteLabel domain={offer.counterpartyDomain} size={24} className="gap-2.5" />
            <span className="font-mono text-base text-muted-foreground">#{offer.ref}</span>
          </span>
        }
        description={`${offer.direction === "received" ? "Offer you received" : "Offer you sent"} for ${offer.yourDomain}`}
        back={{ href: "/offers", label: "Offers" }}
      />
      <OfferDetail offer={offer} counterpartyDr={offer.counterpartyDr} payout={payout} proofUrl={proofUrl} />
    </div>
  );
}
