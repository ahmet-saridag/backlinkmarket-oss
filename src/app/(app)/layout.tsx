import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserProvider, type SessionUser } from "@/components/account/user-context";
import { AppDataProvider } from "@/components/layout/app-data";
import { AppShell } from "@/components/layout/AppShell";
import { backlinksFromOffers, listOffersForViewer, notificationsFromOffers } from "@/lib/offers-data";
import { listRealUserSites } from "@/lib/sites-data";
import { getStanding } from "@/lib/standing-data";
import { createClient } from "@/lib/supabase/server";

// Everything behind sign-in is private: keep it out of search even if a link to it leaks.
export const metadata: Metadata = { robots: { index: false, follow: false } };

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const [{ data: profile }, { data: payout }, sites, offers, standing] = await Promise.all([
    supabase.from("profiles").select("full_name, email, avatar_url, plan, notifications_read_at, timezone").eq("id", auth.user.id).maybeSingle(),
    supabase.from("payout_accounts").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
    listRealUserSites(),
    listOffersForViewer(),
    getStanding(supabase, auth.user.id),
  ]);

  const email = profile?.email ?? auth.user.email ?? null;
  const displayName = profile?.full_name || email?.split("@")[0] || "Account";
  const user: SessionUser = {
    id: auth.user.id,
    displayName,
    initials: initialsOf(displayName),
    avatarUrl: profile?.avatar_url ?? null,
    email,
    plan: profile?.plan ?? "Free",
    payoutConnected: !!payout,
    timezone: profile?.timezone ?? null,
  };

  return (
    <UserProvider user={user}>
      <AppDataProvider data={{ sites, offers, backlinks: backlinksFromOffers(offers), notifications: notificationsFromOffers(offers, profile?.notifications_read_at ?? null), standing }}>
        <AppShell>{children}</AppShell>
      </AppDataProvider>
    </UserProvider>
  );
}
