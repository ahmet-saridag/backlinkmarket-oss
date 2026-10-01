import { displayTraffic } from "@/lib/traffic-ranges";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BadgeCheck, Clock, FileText, Link2, PanelBottom, PenLine, Star, Zap } from "lucide-react";
import { GatedButton, GoogleButton, PublicHeader } from "@/components/landing/public-ui";
import { JsonLd } from "@/components/shared/JsonLd";
import { listingJsonLd, organizationJsonLd } from "@/lib/json-ld";
import { PaysVia } from "@/components/markets/PaysVia";
import { SellerAvatar } from "@/components/markets/SellerAvatar";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { SiteFavicon } from "@/components/shared/SiteFavicon";
import { countryFlag } from "@/lib/flags";
import { barWidth, drHeat, heatBar, heatText, trafficHeat, trafficT } from "@/lib/heat";
import { categoryLabels, durationLabels, formatNumber, formatUsd } from "@/lib/labels";
import { domainOfListedSite, getOwnerOtherSites, getPublicMarketSite } from "@/lib/market-data";
import { domainFromParam, isUuid } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Category, CategoryListing } from "@/lib/types";

type Props = { params: Promise<{ domain: string }> };

const findSite = (param: string) => getPublicMarketSite(domainFromParam(param), "all");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain: param } = await params;
  // Old uuid links redirect from the page itself; give them no metadata of their own
  if (isUuid(param)) return { title: "Listing · Backlink Market", robots: { index: false } };
  const site = await findSite(param);
  if (!site) return { title: "Listing · Backlink Market", robots: { index: false } };
  const title = `Buy backlinks on ${site.domain} (DR ${site.dr}) · Backlink Market`;
  const description = `${site.domain}: Domain Rating ${site.dr}, ${displayTraffic(site.traffic)} organic visits a month, ${site.niches.slice(0, 3).join(", ")}. See placements, prices and the seller's requirements.`;
  return {
    title,
    description,
    alternates: { canonical: `/listing/${site.domain}` },
    openGraph: { title, description, url: `/listing/${site.domain}`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const aiText = { not_accepted: "No AI content", ai_assisted: "AI-assisted OK", any: "Any content" } as const;
const catIcon: Record<Category, typeof PenLine> = { guest_post: PenLine, link_insertion: Link2, review: Star, footer_link: PanelBottom };
const catWhat: Record<Category, string> = {
  guest_post: "A new article on their site with your link",
  link_insertion: "Your link added to an existing page",
  review: "A dedicated review of your product",
  footer_link: "Your link in the site-wide footer",
};
const net = (l: CategoryListing) => Math.round(l.price * (1 - l.discountPct / 100));
const memberSince = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** Public listing page: the site, who can buy on it, what's for sale — every action asks to sign in. */
export default async function ListingPage({ params }: Props) {
  const { domain: param } = await params;
  if (isUuid(param)) {
    const d = await domainOfListedSite(param);
    if (d) permanentRedirect(`/listing/${d}`);
    notFound();
  }
  const site = await findSite(param);
  if (!site) notFound();
  const others = await getOwnerOtherSites(site.domain);
  const paid = site.markets.includes("paid") && site.listings.length > 0;
  const r = site.requirements;
  const s = site.seller;

  // Paid Market has no minimum Domain Rating or traffic — whoever pays can buy. What's left is what nobody may send.
  const rules: { rule: React.ReactNode; why: string }[] = [
    { rule: <>Be a site you&apos;ve added and verified here</>, why: "The link is for a site you own — any Domain Rating, any traffic." },
    ...(r.bannedContent.length
      ? [{ rule: <>Have no <b>{r.bannedContent.join(", ").toLowerCase().replace("cbd", "CBD")}</b> content</>, why: "Anywhere on your site, not just the linked page." }]
      : []),
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 pb-6 md:px-6">
      <JsonLd data={[organizationJsonLd(), ...listingJsonLd(site)]} />
      <PublicHeader />
      <PageHeader title={site.domain} back={{ href: "/", label: "All markets" }} />

      {/* The site at a glance */}
      <section className="grid grid-cols-1 gap-5 rounded-2xl border bg-card p-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-8 md:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border bg-muted/50">
            <SiteFavicon domain={site.domain} size={30} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {countryFlag(site.country)} {site.country} · {site.language} · {site.niches.join(", ")}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {paid && <Pill tone="blue">Paid · from {formatUsd(Math.min(...site.listings.map(net)))}</Pill>}
            </span>
          </div>
        </div>
        <div className="flex gap-8">
          <Metric label="Domain Rating" value={site.dr} fill={site.dr} style={drHeat(site.dr)} />
          <Metric label="Organic traffic" value={displayTraffic(site.traffic)} fill={trafficT(site.traffic) * 100} style={trafficHeat(site.traffic)} />
        </div>
        <div className="flex items-center gap-3 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <SellerAvatar seller={s} size={44} />
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-sm font-medium">
              {s?.name ?? "Owner"}
              {s?.verified && <BadgeCheck className="size-4 text-sky-500" aria-label="Verified" />}
            </span>
            <span className="text-xs text-muted-foreground">
              {site.completedDeals + (s?.failedDeals ?? 0) === 0 ? "New seller · no deals yet" : `${site.reputation}% completion · ${site.completedDeals} deal${site.completedDeals === 1 ? "" : "s"}`}
            </span>
            {s && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                Since {memberSince(s.memberSince)}
                {site.fastResponder && (
                  <>
                    {" "}
                    · <Zap className="size-3 text-amber-500" /> replies fast
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </section>

      {paid && s?.payoutMethod && (
        <section className="flex flex-col gap-2 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-5 md:flex-row md:items-center md:gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium tracking-[0.06em] text-amber-800 uppercase dark:text-amber-300">How you pay</span>
            <span className="text-lg font-medium">{site.domain} accepts payment only by <PaysVia seller={s} className="ml-1 align-middle text-sm" /></span>
            <span className="text-sm text-muted-foreground">
              You pay the seller directly after they accept your offer — there is no card and no escrow. If that method doesn&apos;t work for you, don&apos;t send an offer.
            </span>
          </div>
        </section>
      )}

      {/* The seller's rules for buyers — spelled out, before any price */}
      <section className="grid grid-cols-1 overflow-hidden rounded-2xl border bg-card lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">Seller&apos;s rules</span>
            <h2 className="text-lg font-medium">To buy a link on {site.domain}, your site:</h2>
          </div>
          <ol className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            {rules.map((x, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-xs font-medium">{i + 1}</span>
                <span className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[15px] [&_b]:font-semibold">{x.rule}</span>
                  <span className="text-xs text-muted-foreground">{x.why}</span>
                </span>
              </li>
            ))}
          </ol>
          {site.conditionNote && (
            <p className="rounded-xl bg-muted/50 px-4 py-2.5 text-[13px]">
              <span className="text-muted-foreground">Seller&apos;s note: </span>
              {site.conditionNote}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 border-t bg-muted/30 p-5 md:p-6 lg:border-t-0 lg:border-l">
          <span className="text-sm font-medium">Ready to buy?</span>
          <span className="text-[13px] text-muted-foreground">
            Sign in, pick the site the link is for and send an offer. There is no minimum Domain Rating or traffic.
          </span>
          <GoogleButton label="Sign in to make an offer" size="lg" className="w-full" />
        </div>
      </section>

      {/* What's for sale */}
      {paid && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium">Placements</h2>
            <span className="text-xs text-muted-foreground">Pay the seller directly once they accept</span>
          </div>
          <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", site.listings.length > 2 && "lg:grid-cols-4")}>
            {site.listings.map((l) => {
              const Icon = catIcon[l.category];
              return (
                <div key={l.category} className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl bg-muted">
                      <Icon className="size-4" />
                    </span>
                    {l.discountPct > 0 && (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                        {l.discountPct}% off
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{categoryLabels[l.category]}</span>
                    <span className="text-xs text-muted-foreground">{catWhat[l.category]}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-[450] tracking-[-0.03em] tabular-nums">{formatUsd(net(l))}</span>
                    {l.discountPct > 0 && <span className="text-sm text-muted-foreground line-through">{formatUsd(l.price)}</span>}
                  </div>
                  <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
                    <Spec icon={Clock}>{l.duration === "forever" ? "Stays live forever" : `Stays live for ${durationLabels[l.duration]}`}</Spec>
                    {l.minWords && l.maxWords && (
                      <Spec icon={FileText}>
                        {formatNumber(l.minWords)}–{formatNumber(l.maxWords)} words · {l.aiPolicy ? aiText[l.aiPolicy] : "Any content"}
                      </Spec>
                    )}
                    <Spec icon={Link2}>{l.dofollowFee > 0 ? `Extra dofollow link +${formatUsd(l.dofollowFee)}` : "One dofollow link"}</Spec>
                  </ul>
                  <GatedButton target={`${categoryLabels[l.category]} on ${site.domain}`} className="mt-auto w-full">
                    Choose {categoryLabels[l.category].toLowerCase()}
                  </GatedButton>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* The owner's other listed sites, so a buyer can look at them directly */}
      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium">More from {s?.name ?? "this owner"}</h2>
            <span className="text-xs text-muted-foreground">
              {others.length} other listed site{others.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/listing/${o.domain}`} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/30">
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted/50">
                      <SiteFavicon domain={o.domain} size={22} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{o.domain}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {countryFlag(o.country)} {o.niches.slice(0, 2).join(" · ")}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="text-muted-foreground">DR</span> <span className="font-medium tabular-nums">{o.dr}</span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">{displayTraffic(o.traffic)} / mo</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {o.markets.map((mk) => (
                      <MarketBadge key={mk} market={mk} />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Pill({ tone, children }: { tone: "blue"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "blue" && "bg-blue-500/15 text-blue-700 dark:text-blue-400",
      )}
    >
      {children}
    </span>
  );
}

function Metric({ label, value, fill, style }: { label: string; value: React.ReactNode; fill: number; style: React.CSSProperties }) {
  return (
    <div className="flex w-28 flex-col gap-1.5" style={style}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-3xl leading-none font-semibold tabular-nums", heatText)}>{value}</span>
      <span className="h-1 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", heatBar)} style={{ width: barWidth(fill) }} />
      </span>
    </div>
  );
}

function Spec({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
