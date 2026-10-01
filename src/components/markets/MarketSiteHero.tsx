import { displayTraffic } from "@/lib/traffic-ranges";
import { BadgeCheck, Zap } from "lucide-react";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { SellerAvatar } from "@/components/markets/SellerAvatar";
import { countryFlag } from "@/lib/flags";
import { categoryLabels, formatUsd } from "@/lib/labels";
import { barWidth, drHeat, heatBar, heatText, trafficHeat, trafficT } from "@/lib/heat";
import { cn } from "@/lib/utils";
import type { MarketSite } from "@/lib/types";

const memberSince = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** The listing you're making an offer to: site metrics, seller and prices at a glance. */
export function MarketSiteHero({ site, kind = "paid" }: { site: MarketSite; kind?: "paid" | "exchange" }) {
  const s = site.seller;
  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto] md:p-5">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <SiteLabel domain={site.domain} size={20} className="gap-2 text-lg font-medium" />
            <span className="pl-7 text-xs text-muted-foreground">
              {countryFlag(site.country)} {site.country} · {site.language} · {site.niches.join(", ")}
            </span>
          </div>
          <div className="flex gap-6">
            <Big label="DR" value={site.dr} style={drHeat(site.dr)} fill={site.dr} />
            <Big label="Organic traffic" value={displayTraffic(site.traffic)} style={trafficHeat(site.traffic)} fill={trafficT(site.traffic) * 100} />
          </div>
        </div>

        {kind === "exchange" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Term label="Accepts DR" value={`${site.acceptedDr[0]}–${site.acceptedDr[1]}`} />
            <Term
              label="Link spots"
              value={site.specifyPages ? `${site.exchangeSlots.length} page${site.exchangeSlots.length === 1 ? "" : "s"}` : "Whole site"}
              sub={site.specifyPages ? `${freeSpots(site)} free${site.generalCapacity ? ` · +${site.generalCapacity.maxLinks}/mo anywhere` : ""}` : `${site.sitemapPageCount} pages open`}
            />
            <Term label="Extra links" value={site.multiLinkCompensation ? "Accepted" : "1:1 only"} sub="to balance a DR gap" />
            <Term label="Delivery" value="72 hours" sub="both sides · no money" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {site.listings.map((l) => {
              const net = Math.round(l.price * (1 - l.discountPct / 100));
              return (
                <div key={l.category} className="flex flex-col rounded-xl bg-muted/50 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{categoryLabels[l.category]}</span>
                  <span className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="font-medium">{formatUsd(net)}</span>
                    {l.discountPct > 0 && <span className="text-[11px] text-muted-foreground line-through">{formatUsd(l.price)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seller */}
      <div className="flex flex-col gap-3 border-t pt-4 md:w-60 md:border-t-0 md:border-l md:pt-0 md:pl-5">
        <div className="flex items-center gap-3">
          <SellerAvatar seller={s} size={44} />
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 truncate font-medium">
              {s?.name ?? "Seller"}
              {s?.verified && <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-label="Verified seller" />}
            </span>
            {s && <span className="text-xs text-muted-foreground">Member since {memberSince(s.memberSince)}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="flex flex-col rounded-xl bg-muted/50 py-1.5">
            <span
              className={cn(
                "font-medium tabular-nums",
                site.reputation >= 90 ? "text-green-700 dark:text-green-400" : site.reputation < 85 && "text-amber-700 dark:text-amber-400",
              )}
            >
              {site.completedDeals + (site.seller?.failedDeals ?? 0) === 0 ? "New" : `${site.reputation}%`}
            </span>
            <span className="text-[10px] text-muted-foreground">completion</span>
          </div>
          <div className="flex flex-col rounded-xl bg-muted/50 py-1.5">
            <span className="font-medium tabular-nums">{site.completedDeals}</span>
            <span className="text-[10px] text-muted-foreground">deals done</span>
          </div>
        </div>
        {site.fastResponder && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="size-3.5 text-amber-500" /> Usually replies within a day
          </span>
        )}
      </div>
    </div>
  );
}

const freeSpots = (s: MarketSite) => s.exchangeSlots.reduce((a, x) => a + Math.max(0, x.maxLinks - x.used), 0);

function Term({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-muted/50 px-3 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Big({ label, value, style, fill }: { label: string; value: React.ReactNode; style: React.CSSProperties; fill: number }) {
  return (
    <div className="flex w-24 flex-col gap-1" style={style}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-2xl leading-none font-semibold tabular-nums", heatText)}>{value}</span>
      <span className="h-1 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", heatBar)} style={{ width: barWidth(fill) }} />
      </span>
    </div>
  );
}
