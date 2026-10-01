import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentHistoryView } from "@/components/payments/PaymentHistoryView";
import { loadPayments } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "Payment History · Backlink Market" };

export default async function PaymentHistoryPage({ searchParams }: PageProps<"/payment-history">) {
  const props = await loadPayments((await searchParams) as SP);
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader title="Payment History" description="Payments you received and made, with the offer each belongs to. Pick a period and export it as CSV for your accountant." />
      <PaymentHistoryView {...props} />
    </div>
  );
}
