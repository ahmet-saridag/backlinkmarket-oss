import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddSiteWizard } from "@/components/sites/AddSiteWizard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add Site · Backlink Market" };

export default async function AddSitePage() {
  const supabase = await createClient();
  const { data: account } = await supabase.from("payout_accounts").select("user_id").maybeSingle();
  const payoutConnected = !!account;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Add Site"
        description="Verify ownership, choose markets and set your terms."
        back={{ href: "/sites", label: "My Sites" }}
      />
      <AddSiteWizard payoutConnected={payoutConnected} />
    </div>
  );
}
