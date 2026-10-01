"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Check, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/components/layout/app-data";
import { DateTime } from "@/components/shared/DateTime";
import { SiteFavicon, SiteLabel } from "@/components/shared/SiteFavicon";
import { setHeaderSite, useHeaderSiteId } from "@/components/sites/selected-site";
import { cn } from "@/lib/utils";
import type { UserSite } from "@/lib/types";

/** +3 / −1 / 0 with an arrow; green up, red down. */
export function DrChange({ value, className }: { value: number; className?: string }) {
  // No movement: nothing to show, not even a dash
  if (!value) return null;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs tabular-nums",
        value > 0 ? "text-green-700 dark:text-green-400" : value < 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground",
        className,
      )}
      title="Change since the DR we recorded when the site was added — measured against 30 days ago once it has been here that long. Re-read every day."
    >
      <Icon className="size-3" aria-hidden />
      {Math.abs(value) || ""}
    </span>
  );
}

/**
 * Which of your sites the header follows. Returns the site, `null` for "All sites",
 * or `undefined` when you have no sites.
 */
export function useHeaderSite(): { sites: UserSite[]; site: UserSite | null | undefined } {
  const { sites } = useAppData();
  const id = useHeaderSiteId();
  if (sites.length === 0) return { sites, site: undefined };
  if (id === "all") return { sites, site: null };
  return { sites, site: sites.find((s) => s.id === id) ?? sites[0] };
}

/**
 * Header site switcher: shows the tracked site's DR and 30-day change (or the average for all sites).
 * Picking a site here sets which DR the header shows; Monitoring stays account-wide.
 */
export function SitesDrIndicator() {
  const { sites, site } = useHeaderSite();
  if (site === undefined) return null;

  const ranked = [...sites].sort((a, b) => b.dr - a.dr);
  const avg = Math.round(sites.reduce((a, s) => a + s.dr, 0) / sites.length);
  const avgChange = Math.round(sites.reduce((a, s) => a + s.drChange30d, 0) / sites.length);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-2 rounded-full border px-2.5 sm:pr-3.5"
            aria-label={site ? `Tracking ${site.domain}, Domain Rating ${site.dr}` : `Tracking all sites, average Domain Rating ${avg}`}
          />
        }
      >
        {site ? <SiteFavicon domain={site.domain} /> : <Layers className="size-4 text-muted-foreground" />}
        <span className="hidden max-w-32 truncate text-[13px] md:inline">{site ? site.domain : "All sites"}</span>
        <span className="text-[13px]">
          <span className="text-muted-foreground">{site ? "DR" : "Avg DR"}</span>{" "}
          <span className="font-medium tabular-nums">{site ? site.dr : avg}</span>
        </span>
        <DrChange value={site ? site.drChange30d : avgChange} className="hidden sm:inline-flex" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="flex flex-col gap-1 px-2 pt-2 pb-1">
          <span className="text-sm font-medium">Track a site</span>
          <span className="text-xs text-muted-foreground">
            The header shows the Domain Rating of the site you pick.
          </span>
        </div>
        <DropdownMenuItem onClick={() => setHeaderSite("all")} className="gap-2">
          <Layers className="size-4 text-muted-foreground" />
          <span className="flex-1">All sites</span>
          <span className="text-xs text-muted-foreground">avg</span>
          <span className="w-8 text-right font-medium tabular-nums">{avg}</span>
          <span className="flex w-8 justify-end">
            {site === null ? <Check className="size-4" /> : <DrChange value={avgChange} />}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ul className="max-h-72 overflow-y-auto">
          {ranked.map((s) => {
            const on = site?.id === s.id;
            return (
              <li key={s.id}>
                <DropdownMenuItem onClick={() => setHeaderSite(s.id)} className={cn("gap-2", on && "bg-accent/60")}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <SiteLabel domain={s.domain} className={cn(s.status === "paused" && "text-muted-foreground")} />
                    {s.drCheckedAt && (
                      <span className="pl-6 text-[11px] text-muted-foreground">
                        DR read <DateTime iso={s.drCheckedAt} />
                      </span>
                    )}
                  </span>
                  {s.status === "paused" && <span className="text-[11px] text-muted-foreground">Paused</span>}
                  <span className="w-8 text-right font-medium tabular-nums">{s.dr}</span>
                  <span className="flex w-8 justify-end">{on ? <Check className="size-4" /> : <DrChange value={s.drChange30d} />}</span>
                </DropdownMenuItem>
              </li>
            );
          })}
        </ul>
        <DropdownMenuSeparator />
        {site && (
          <DropdownMenuItem render={<Link href={`/sites/${site.domain}`} />}>
            Open {site.domain} <ArrowRight className="ml-auto size-3.5" />
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/sites" />}>
          Manage sites <ArrowRight className="ml-auto size-3.5" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
