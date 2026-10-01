import type { Metadata } from "next";
import { DashboardView, type DashboardData, type TodoItem } from "@/components/dashboard/DashboardView";
import { formatUsd } from "@/lib/labels";
import { getRealMarketSites } from "@/lib/market-data";
import { missingCase } from "@/lib/missing-links";
import { needsAction } from "@/lib/offer-actions";
import { actionLabel, nextStep } from "@/lib/offer-stage";
import { backlinksFromOffers, listOffersForViewer, notificationsFromOffers } from "@/lib/offers-data";
import { listRealUserSites } from "@/lib/sites-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard · Backlink Market" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user!.id;
  const [{ data: me }, { data: paymentRows }, sites, offers, paidListings] = await Promise.all([
    supabase.from("profiles").select("full_name, notifications_read_at").eq("id", userId).maybeSingle(),
    supabase.from("payments").select("type, amount, status, date").eq("user_id", userId),
    listRealUserSites(),
    listOffersForViewer(),
    getRealMarketSites("paid"),
  ]);
  const payments = paymentRows ?? [];
  const backlinks = backlinksFromOffers(offers);

  // One queue for everything that waits on you, most urgent first
  const offerTodos: TodoItem[] = offers.filter(needsAction).map((o) => ({
    id: o.id,
    kind: "offer",
    market: o.type,
    domain: o.counterpartyDomain,
    title: nextStep(o),
    detail: `${o.direction === "received" ? "Offer from" : "Your offer to"} ${o.counterpartyDomain} · for ${o.yourDomain}${o.amount ? ` · ${formatUsd(o.amount)}` : ""}`,
    cta: actionLabel(o) ?? "Open",
    href: `/offers/${o.ref}`,
    urgency: o.status === "ANOMALY_CHECK" ? 0 : o.status === "PAYMENT_RECEIVED" ? 1 : 2,
  }));
  const linkTodos: TodoItem[] = backlinks.flatMap((b) => {
    const c = missingCase(b);
    if (!c || c.remover !== "you" || c.stage !== "waiting") return [];
    return [
      {
        id: b.id,
        kind: "link",
        market: b.market,
        domain: b.sourceDomain,
        title: `Put your link to ${b.targetDomain} back · ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"} left`,
        detail: `Missing from ${b.sourceDomain}${b.sourcePage} since ${c.detectedAt}`,
        cta: "See case",
        href: `/backlinks?state=missing&case=${b.id}`,
        urgency: c.daysLeft <= 2 ? 0 : 1,
      },
    ];
  });
  const todos = [...offerTodos, ...linkTodos].sort((a, b) => a.urgency - b.urgency);

  const active = backlinks.filter((b) => b.status === "active");
  const live = active.filter((b) => b.live);
  const missing = active.filter((b) => !b.live);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const sum = (xs: typeof payments) => xs.reduce((a, p) => a + Number(p.amount), 0);
  const activeSites = sites.filter((s) => s.status === "active");
  const prices = paidListings.flatMap((s) => s.listings.map((l) => Math.round(l.price * (1 - l.discountPct / 100))));

  const data: DashboardData = {
    name: me?.full_name?.split(" ")[0] ?? "there",
    today,
    todos,
    links: {
      live: live.length,
      received: live.filter((b) => b.direction === "received").length,
      given: live.filter((b) => b.direction === "given").length,
      missing: missing.length,
    },
    money: {
      toYou: sum(payments.filter((p) => p.type === "received" && p.status === "pending")),
      fromYou: sum(payments.filter((p) => p.type === "sent" && p.status === "pending")),
      earnedThisMonth: sum(payments.filter((p) => p.type === "received" && p.status === "completed" && p.date.startsWith(month))),
    },
    sites: {
      total: sites.length,
      paused: sites.length - activeSites.length,
      avgDr: Math.round(activeSites.reduce((a, s) => a + s.dr, 0) / Math.max(1, activeSites.length)),
      top: [...activeSites]
        .sort((a, b) => b.dr - a.dr)
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          domain: s.domain,
          dr: s.dr,
          drChange: s.drChange30d,
          markets: s.markets,
          openOffers: offers.filter((o) => o.yourDomain === s.domain && needsAction(o)).length,
        })),
    },
    markets: {
      paid: { sites: paidListings.length, from: prices.length ? Math.min(...prices) : 0 },
    },
    notifications: notificationsFromOffers(offers, me?.notifications_read_at ?? null),
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <DashboardView data={data} />
    </div>
  );
}
