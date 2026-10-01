"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, Globe, Link2, ListTodo, Plus, TriangleAlert, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RecentNotifications } from "@/components/dashboard/RecentNotifications";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge, marketIcons } from "@/components/shared/MarketBadge";
import { SiteFavicon, SiteLabel } from "@/components/shared/SiteFavicon";
import { DrChange } from "@/components/sites/SitesDrIndicator";
import { drHeat, heatText } from "@/lib/heat";
import { formatUsd } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { MarketType, NotificationItem } from "@/lib/types";

export interface TodoItem {
  id: string;
  kind: "offer" | "abc" | "link";
  market: MarketType;
  domain: string;
  title: string;
  detail: string;
  cta: string;
  href: string;
  /** 0 = most urgent */
  urgency: number;
}

export interface DashboardData {
  name: string;
  today: string;
  todos: TodoItem[];
  links: { live: number; received: number; given: number; missing: number };
  money: { toYou: number; fromYou: number; earnedThisMonth: number };
  sites: {
    total: number;
    paused: number;
    avgDr: number;
    top: { id: string; domain: string; dr: number; drChange: number; markets: MarketType[]; openOffers: number }[];
  };
  markets: {
    paid: { sites: number; from: number };
  };
  notifications: NotificationItem[];
}

const kindLabel: Record<TodoItem["kind"], string> = { offer: "Offers", abc: "ABC pools", link: "Links" };

export function DashboardView({ data }: { data: DashboardData }) {
  const [kind, setKind] = useState<"all" | TodoItem["kind"]>("all");

  const { todos, links, money, sites } = data;
  const shown = todos.filter((t) => kind === "all" || t.kind === kind);
  const counts = (k: TodoItem["kind"]) => todos.filter((t) => t.kind === k).length;
  const date = new Date(`${data.today}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <>
      {/* Greeting + the two things people come here to do */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">{date}</span>
          <h1 className="text-[28px] leading-tight font-[450] tracking-[-0.035em]">Welcome back, {data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {todos.length
              ? `${todos.length} thing${todos.length > 1 ? "s" : ""} wait${todos.length === 1 ? "s" : ""} on you today.`
              : "Nothing waits on you right now."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sites/new" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
            <Plus className="size-4" /> Add a site
          </Link>
          <Link href="/markets/paid" className={cn(buttonVariants(), "rounded-full")}>
            Browse markets <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Today at a glance — each tile opens the page behind it */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          href="#todo"
          icon={ListTodo}
          label="Waiting on you"
          value={todos.length}
          tone={todos.length ? "amber" : undefined}
          hint={todos.length ? `${counts("offer")} offers · ${counts("abc")} pools · ${counts("link")} links` : "All caught up"}
        />
        <Tile
          href="/backlinks"
          icon={Link2}
          label="Live backlinks"
          value={links.live}
          hint={
            links.missing ? (
              <span className="text-amber-700 dark:text-amber-400">{links.missing} missing · being handled</span>
            ) : (
              `${links.received} received · ${links.given} given`
            )
          }
        />
        <Tile
          href="/payments"
          icon={Wallet}
          label="Coming to you"
          value={formatUsd(money.toYou)}
          hint={`payment sent, not yet delivered · you paid ${formatUsd(money.fromYou)}`}
        />
        <Tile
          href="/sites"
          icon={Globe}
          label="Your sites"
          value={sites.total}
          hint={sites.total ? `avg DR ${sites.avgDr} · ${sites.paused} paused` : "Add one to start trading"}
        />
      </div>

      {/* To-do queue + activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section id="todo" className="flex scroll-mt-4 flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h2 className="text-base font-medium">Your to-do</h2>
              <span className="text-xs text-muted-foreground">Offers, ABC pools and links that wait on you — most urgent first</span>
            </div>
            {todos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(["all", "offer", "abc", "link"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    aria-pressed={kind === k}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      kind === k ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {k === "all" ? `All ${todos.length}` : `${kindLabel[k]} ${counts(k)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          {shown.length === 0 ? (
            <EmptyState
              compact
              icon={CircleCheck}
              title="You're all caught up"
              description="Offers to answer, links to deliver and ABC pools that need your link show up here."
            />
          ) : (
            <ul className="max-h-[520px] divide-y overflow-y-auto">
              {shown.map((t) => {
                const Icon = marketIcons[t.market];
                return (
                  <li key={`${t.kind}-${t.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="relative shrink-0">
                      <span className="grid size-9 place-items-center rounded-full bg-muted">
                        <SiteFavicon domain={t.domain} size={18} />
                      </span>
                      <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-card bg-foreground text-background">
                        <Icon className="size-2.5" />
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium">
                        {t.urgency === 0 && <TriangleAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Urgent" />}
                        <span className="truncate">{t.title}</span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{t.detail}</span>
                    </div>
                    <Link href={t.href} className={cn(buttonVariants({ size: "sm" }), "shrink-0 rounded-full")}>
                      {t.cta}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <RecentNotifications items={data.notifications} />
      </div>

      {/* Markets, with what's in them for you */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Markets</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MarketCard
            market="paid"
            href="/markets/paid"
            headline={`${data.markets.paid.sites} sites for sale`}
            lines={[
              data.markets.paid.sites ? `Placements from ${formatUsd(data.markets.paid.from)}` : "No listings from other sellers yet",
              "Pay the seller directly · wire, PayPal, USDT or bank transfer",
            ]}
            cta="Browse Paid"
          />
          <MarketCard
            market="exchange"
            href="/markets/exchange"
            headline="Swap links 1:1"
            lines={["Trade links — no money involved", "Coming soon"]}
            cta="Learn more"
          />
          <MarketCard
            market="abc"
            href="/markets/abc"
            headline="Three-way link loops"
            lines={["A links to B, B to C, C back to A", "Coming soon"]}
            cta="Learn more"
          />
        </div>
      </section>

      {/* Strongest sites */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-medium">Your strongest sites</h2>
          <Link href="/sites" className="text-xs text-muted-foreground hover:text-foreground">
            {sites.total ? `All ${sites.total} sites →` : "My Sites →"}
          </Link>
        </div>
        {sites.top.length === 0 ? (
          <EmptyState
            bordered
            compact
            icon={Globe}
            title="No sites yet"
            description="Add and verify a site to sell placements, swap links or join ABC pools."
            action={
              <Link href="/sites/new" className={cn(buttonVariants(), "rounded-full")}>
                Add a site
              </Link>
            }
          />
        ) : (
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {sites.top.map((s) => (
              <Link key={s.id} href={`/sites/${s.domain}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                <SiteLabel domain={s.domain} className="min-w-0 flex-1 text-[13px] font-medium" />
                <span className="hidden gap-1 md:flex">
                  {s.markets.map((m) => (
                    <MarketBadge key={m} market={m} icon />
                  ))}
                </span>
                {s.openOffers > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    {s.openOffers} waiting
                  </span>
                )}
                <span className="flex w-20 items-center justify-end gap-1.5" style={drHeat(s.dr)}>
                  <span className={cn("font-semibold tabular-nums", heatText)}>DR {s.dr}</span>
                  <DrChange value={s.drChange} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  icon: typeof Globe;
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  tone?: "amber";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-1 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20",
        tone === "amber" && "border-amber-500/40 bg-amber-500/[0.06]",
      )}
    >
      <span className="flex items-center justify-between text-[13px] text-muted-foreground">
        {label}
        <Icon className={cn("size-4", tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/60")} />
      </span>
      <span className="text-3xl font-[450] tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="truncate text-xs text-muted-foreground">{hint}</span>
    </Link>
  );
}

function MarketCard({
  market,
  href,
  headline,
  lines,
  cta,
  alert,
}: {
  market: MarketType;
  href: string;
  headline: string;
  lines: string[];
  cta: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20",
        alert && "border-amber-500/40",
      )}
    >
      <MarketBadge market={market} icon className="w-fit" />
      <span className="text-lg leading-snug font-medium">{headline}</span>
      <span className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
        {lines.map((l, i) => (
          <span key={l} className={cn(alert && i === 0 && "text-amber-700 dark:text-amber-400")}>
            {l}
          </span>
        ))}
      </span>
      <span className="mt-auto flex items-center gap-1 text-[13px] font-medium">
        {cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
