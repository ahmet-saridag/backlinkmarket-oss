import { DateTime } from "@/components/shared/DateTime";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, FileText, Handshake, Link2, Lock, PanelBottom, Pencil, Star, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { MarketBadge, marketIcons } from "@/components/shared/MarketBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { DrChange } from "@/components/sites/SitesDrIndicator";
import { SiteOffersLink } from "@/components/sites/SiteOffersLink";
import { SiteStatusBadge } from "@/components/sites/SiteStatusBadge";
import { aiPolicyLabels, categoryLabels, durationLabels, formatNumber, formatUsd, marketLabels, periodLabels } from "@/lib/labels";
import { trafficRangeLabelFor } from "@/lib/traffic-ranges";
import { backlinksFromOffers, listOffersForViewer } from "@/lib/offers-data";
import { offerStage } from "@/lib/offer-stage";
import { domainOfUserSite, getRealUserSite } from "@/lib/sites-data";
import { domainFromParam, isUuid } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Category, MarketType, SiteCategoryConfig, UserSite } from "@/lib/types";

export const metadata: Metadata = { title: "Site · Backlink Market" };

/** Short, scannable points for a price card (replaces the old "Details" column). */
function categoryPoints(c: SiteCategoryConfig): string[] {
  const pts: string[] = [];
  if (c.category === "guest_post") {
    pts.push(`${formatNumber(c.minWords ?? 0)}–${formatNumber(c.maxWords ?? 0)} words`);
    if (c.aiPolicy) pts.push(`AI content: ${aiPolicyLabels[c.aiPolicy]}`);
  }
  if (c.category === "link_insertion") pts.push(`${c.pages?.length ?? 0} pages open for insertion`);
  if (c.category === "review") {
    if (c.reviewProcess) pts.push(c.reviewProcess);
    if (c.reviewProductRequirement) pts.push(c.reviewProductRequirement);
  }
  if (c.notes) pts.push(c.notes);
  return pts;
}

const categoryIcons: Record<Category, LucideIcon> = {
  guest_post: FileText,
  link_insertion: Link2,
  review: Star,
  footer_link: PanelBottom,
};

/** One line per market: what this site offers there, or that it isn't listed. */
function marketSummary(site: UserSite, m: MarketType): string {
  const t = site.exchangeTerms;
  if (!site.markets.includes(m)) return m === "paid" ? "Not for sale" : "Not open";
  if (m === "paid") {
    const prices = site.categories.map((c) => c.price);
    return prices.length
      ? `${site.categories.length} ${site.categories.length === 1 ? "category" : "categories"} · from ${formatUsd(Math.min(...prices))}`
      : "No categories priced yet";
  }
  if (m === "exchange") {
    if (!t) return "Link Insertion swaps";
    return `Accepts DR ${t.drMin}–${t.drMax} · ${t.specifyPages ? `${t.slots.length} slots` : "whole sitemap"}`;
  }
  return "Coming soon";
}

const spamTone = (score: number) =>
  score <= 5 ? "text-green-700 dark:text-green-400" : score <= 15 ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400";

export default async function SiteDetailPage({ params }: PageProps<"/sites/[domain]">) {
  const { domain: param } = await params;
  if (isUuid(param)) {
    const d = await domainOfUserSite(param);
    if (d) redirect(`/sites/${d}`);
    notFound();
  }
  const site = await getRealUserSite(domainFromParam(param));
  if (!site) notFound();

  const t = site.exchangeTerms;

  // This site's deals and links
  const offers = await listOffersForViewer();
  const backlinks = backlinksFromOffers(offers);
  const siteOffers = offers.filter((o) => o.yourDomain === site.domain);
  const open = siteOffers.filter((o) => offerStage(o) !== "closed").length;
  const needYou = siteOffers.filter((o) => offerStage(o) === "action").length;
  const siteLinks = backlinks.filter(
    (b) => b.status === "active" && (b.direction === "given" ? b.sourceDomain : b.targetDomain) === site.domain,
  );
  const missing = siteLinks.filter((b) => !b.live).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <SiteLabel domain={site.domain} size={24} className="gap-2.5" />
            {/* Only a paused site gets a badge; active is the default */}
            {site.status === "paused" && <SiteStatusBadge status="paused" />}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              DR <span className="font-medium text-foreground tabular-nums">{site.dr}</span>
              <DrChange value={site.drChange30d} />
            </span>
            <span>·</span>
            <span>{trafficRangeLabelFor(site.traffic) ?? `${formatNumber(site.traffic)} visits/mo`}</span>
            <span>·</span>
            <span className="flex flex-wrap gap-1">
              {site.niches.map((n) => (
                <Badge key={n} variant="outline" className="rounded-full font-normal">
                  {n}
                </Badge>
              ))}
            </span>
          </span>
        }
        back={{ href: "/sites", label: "My Sites" }}
        actions={
          <>
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}
            >
              <ExternalLink className="size-3.5" /> Visit site
            </a>
            <SiteOffersLink siteId={site.id} className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
              <Handshake className="size-3.5" /> View offers
            </SiteOffersLink>
            <Link href={`/sites/${site.domain}/edit`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
              <Pencil className="size-3.5" /> Edit
            </Link>
          </>
        }
      />

      {/* ---- At a glance ---- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Domain Rating"
          value={site.dr}
          hint={<DrChange value={site.drChange30d} />}
          hintText="last 30 days"
          note={
            site.drCheckedAt ? (
              <>
                Last read <DateTime iso={site.drCheckedAt} /> · next <DateTime iso={new Date(Date.parse(site.drCheckedAt) + 86_400_000).toISOString()} />
              </>
            ) : undefined
          }
        />
        <Kpi label="Monthly traffic" value={trafficRangeLabelFor(site.traffic) ?? formatNumber(site.traffic)} hintText="organic visits" />
        <Kpi label="Spam score" value={`${site.spamScore}%`} valueClass={spamTone(site.spamScore)} hintText="lower is better" />
        <SiteOffersLink
          siteId={site.id}
          aria-label={`View ${open} open offers for ${site.domain}`}
          className="flex flex-col gap-0.5 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-foreground/30"
        >
          <span className="flex items-center justify-between text-[13px] text-muted-foreground">
            Open offers <ArrowRight className="size-3.5" />
          </span>
          <span className="text-2xl font-[450] tracking-tight tabular-nums">{open}</span>
          <span className={cn("text-xs", needYou ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
            {needYou ? `${needYou} need your action` : `${siteOffers.length} offers in total`}
          </span>
        </SiteOffersLink>
        <Link
          href={missing ? "/backlinks?state=missing" : "/backlinks"}
          className="col-span-2 flex flex-col gap-0.5 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/30 md:col-span-1"
        >
          <span className="flex items-center justify-between text-[13px] text-muted-foreground">
            Live backlinks <ArrowRight className="size-3.5" />
          </span>
          <span className="text-2xl font-[450] tracking-tight tabular-nums">{siteLinks.length - missing}</span>
          <span className={cn("text-xs", missing ? "font-medium text-red-700 dark:text-red-400" : "text-muted-foreground")}>
            {missing ? `${missing} missing` : "all on the page"}
          </span>
        </Link>
      </div>

      {/* ---- Markets ---- */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["paid", "exchange", "abc"] as MarketType[]).map((m) => {
          const listed = site.markets.includes(m);
          // A paused site is hidden from every market it's listed in
          const paused = listed && site.status === "paused";
          const on = listed && !paused;
          const Icon: LucideIcon = marketIcons[m];
          return (
            <div key={m} className={cn("flex items-start gap-3 rounded-2xl border p-4", on ? "bg-card" : "border-dashed")}>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full border", on ? "bg-foreground text-background" : "text-muted-foreground")}>
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {m === "abc" ? "ABC pool" : `${marketLabels[m]} ${m === "paid" ? "Market" : ""}`}
                  <span
                    className={cn(
                      "text-[11px] font-normal",
                      on ? "text-green-700 dark:text-green-400" : paused ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
                    )}
                  >
                    {on ? "● On" : paused ? "Paused · hidden" : "Off"}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{marketSummary(site, m)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {t && (
        <section className="flex flex-col gap-3">
          <SectionTitle
            title="Exchange & ABC terms"
            badge={<MarketBadge market="exchange" icon />}
            hint="Link Insertion only — who you swap with and where their links can go."
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            {/* Accepted DR drawn on a 0–100 scale so the window is obvious at a glance */}
            <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <span className="text-[13px] text-muted-foreground">Accepted partner DR</span>
              <span className="text-2xl font-[450] tracking-tight tabular-nums">
                {t.drMin}–{t.drMax}
              </span>
              <div className="relative h-2 rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 rounded-full bg-foreground/70"
                  style={{ left: `${t.drMin}%`, width: `${Math.max(2, t.drMax - t.drMin)}%` }}
                />
                <div className="absolute -top-1 h-4 w-0.5 rounded bg-sky-500" style={{ left: `${site.dr}%` }} title={`Your DR ${site.dr}`} />
              </div>
              <span className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>0</span>
                <span className="text-sky-600 dark:text-sky-400">your DR {site.dr}</span>
                <span>100</span>
              </span>
            </div>
            <Kpi
              label="Partner traffic"
              value={`${formatNumber(t.trafficMin)}${t.trafficMax ? `–${formatNumber(t.trafficMax)}` : "+"}`}
              hintText="visits / month"
            />
            <Kpi
              label="Multi-link"
              value={t.multiLinkCompensation ? "Open" : "No"}
              valueClass={t.multiLinkCompensation ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}
              hintText={t.multiLinkCompensation ? "extra links compensated" : "one link per swap"}
            />
            <Kpi
              label="Capacity"
              value={t.generalCapacity ? `${t.generalCapacity.maxLinks}` : "∞"}
              hintText={t.generalCapacity ? `links / ${periodLabels[t.generalCapacity.period].toLowerCase()}` : "no cap"}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Open pages</span>
              <span className="text-xs text-muted-foreground">
                {t.specifyPages ? `${t.slots.length} exact slots` : `Whole sitemap · ${site.sitemapPageCount} pages`}
              </span>
            </div>
            {t.specifyPages && t.slots.length > 0 ? (
              <ul className="flex flex-col divide-y">
                {t.slots.map((sl) => {
                  const pct = Math.min(100, Math.round((sl.used / sl.maxLinks) * 100));
                  return (
                    <li key={sl.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-xs">
                          {sl.lockedByOfferId ? <Lock className="size-3 shrink-0" /> : <Link2 className="size-3 shrink-0 text-muted-foreground" />}
                          {sl.page.replace(/^https?:\/\//, "")}
                        </span>
                        {(sl.note || sl.lockedByOfferId) && (
                          <span className="text-[11px] text-muted-foreground">
                            {sl.note}
                            {sl.note && sl.lockedByOfferId && " · "}
                            {sl.lockedByOfferId && `locked by ${sl.lockedByOfferId}`}
                          </span>
                        )}
                      </div>
                      {/* Slot usage: how many of the allowed links this period are taken */}
                      <div className="flex w-full items-center gap-2 sm:w-56">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", pct >= 100 ? "bg-amber-500" : "bg-foreground/70")} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                          {sl.used}/{sl.maxLinks} · {periodLabels[sl.period]}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Partners can place their link on any of your {site.sitemapPageCount} sitemap pages.
              </p>
            )}
          </div>
        </section>
      )}
      {site.markets.includes("paid") && (
        <section className="flex flex-col gap-3">
          <SectionTitle
            title="Paid Market prices"
            badge={<MarketBadge market="paid" icon />}
            hint="What buyers see and pay, per category."
          />
          {site.categories.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No categories priced yet.{" "}
              <Link href={`/sites/${site.domain}/edit`} className="underline underline-offset-2">
                Add prices
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {site.categories.map((c) => {
                const Icon = categoryIcons[c.category];
                const final = c.price * (1 - c.discountPct / 100);
                return (
                  <div key={c.category} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </span>
                      <span className="text-sm font-medium">{categoryLabels[c.category]}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-[450] tracking-tight tabular-nums">{formatUsd(final)}</span>
                      {c.discountPct > 0 && (
                        <span className="text-sm text-muted-foreground tabular-nums line-through">{formatUsd(c.price)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>{durationLabels[c.duration]}</Chip>
                      {c.dofollowFee > 0 && <Chip>+{formatUsd(c.dofollowFee)} / extra dofollow</Chip>}
                      {c.discountPct > 0 && <Chip tone="green">{c.discountPct}% off</Chip>}
                    </div>
                    {categoryPoints(c).length > 0 && (
                      <ul className="flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground">
                        {categoryPoints(c).map((pt) => (
                          <li key={pt} className="flex gap-1.5">
                            <Check className="mt-0.5 size-3 shrink-0" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  hintText,
  note,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintText?: string;
  note?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border bg-card p-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-[450] tracking-tight tabular-nums", valueClass)}>{value}</span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {hint}
        {hintText}
      </span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

function SectionTitle({ title, badge, hint }: { title: string; badge?: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="flex items-center gap-2 text-base font-medium">
        {title} {badge}
      </h2>
      {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "green" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px]",
        tone === "green" ? "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400" : "bg-muted/50 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
