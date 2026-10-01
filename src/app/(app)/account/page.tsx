import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationSettings, PaymentsGroup, ProfileSection } from "@/components/account/AccountSections";
import { AccountTabs } from "@/components/account/AccountTabs";
import { ProfileHero } from "@/components/account/ProfileHero";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrustStandingSection } from "@/components/standing/TrustStandingSection";
import { offerLimits } from "@/lib/market-rules";
import { listOffersForViewer } from "@/lib/offers-data";
import { listRealUserSites } from "@/lib/sites-data";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPrefs } from "@/lib/validation/account";
import type { AccountProfile, PayoutAccount } from "@/lib/types";

export const metadata: Metadata = { title: "Account · Backlink Market" };

// Roomier than the default card padding.
const cardClass = "rounded-2xl [--card-spacing:--spacing(6)]";

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const fullDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user!.id; // the (app) layout already redirects signed-out visitors

  const [{ data: row }, { data: payoutRow }, offers, userSites, { data: sentToday }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("payout_accounts").select("method, account_holder, network, address").eq("user_id", userId).maybeSingle(),
    listOffersForViewer(),
    listRealUserSites(),
    supabase.rpc("offers_sent_24h"),
  ]);
  if (!row) throw new Error("Profile not found");

  const accountProfile: AccountProfile = {
    displayName: row.full_name ?? "",
    username: row.username,
    country: row.country ?? "",
    language: row.language,
    timezone: row.timezone,
    memberSince: monthYear(row.created_at),
    email: row.email ?? "",
    // Every account is verified by signing in with Google.
    verification: { method: "Signed in with Google", verifiedAt: fullDate(row.created_at) },
  };
  const payout: PayoutAccount = payoutRow
    ? { connected: true, method: payoutRow.method, accountHolder: payoutRow.account_holder, network: payoutRow.network ?? undefined, address: payoutRow.address }
    : { connected: false };
  const notificationPrefs = row.notification_prefs as NotificationPrefs;

  const done = offers.filter((o) => o.status === "COMPLETED").length;
  const closed = offers.filter((o) => ["COMPLETED", "EXPIRED", "CANCELLED", "VIOLATED_BANNED"].includes(o.status)).length;
  const stats = [
    { label: "Sites", value: String(userSites.length) },
    { label: "Completed deals", value: String(done) },
    { label: "Offers sent (24h)", value: `${sentToday ?? 0} / ${offerLimits.perDay}` },
    { label: "Completion rate", value: `${closed ? Math.round((done / closed) * 100) : 100}%` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader title="Account" description="Your profile, how you get paid and how you pay, your standing and alerts." />

      <ProfileHero profile={accountProfile} stats={stats} />

      <AccountTabs
        panels={{
          profile: (
            <Card className={cardClass}>
              <CardContent>
                <ProfileSection profile={accountProfile} />
              </CardContent>
            </Card>
          ),
          payments: (
            <Card className={cardClass}>
              <CardContent className="flex flex-col gap-6">
                <PaymentsGroup payout={payout} />
              </CardContent>
            </Card>
          ),
          standing: (
            <Card className={cardClass}>
              <CardContent>
                <TrustStandingSection />
              </CardContent>
            </Card>
          ),
          notifications: (
            <Card className={cardClass}>
              <CardContent>
                <NotificationSettings initial={notificationPrefs} />
              </CardContent>
            </Card>
          ),
        }}
      />
    </div>
  );
}
