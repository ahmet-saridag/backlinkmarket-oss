"use client";

import { DateTime } from "@/components/shared/DateTime";
import Link from "next/link";
import { ArrowRight, Radar, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/components/layout/app-data";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { missingBadgeClass } from "@/components/backlinks/MissingLinkSheet";
import { missingCase } from "@/lib/missing-links";
import { cn } from "@/lib/utils";
import type { Backlink } from "@/lib/types";

/** Your side of the link: the page's site when you gave it, the target when you received it. */
export const yourSiteOf = (b: Backlink) => (b.direction === "given" ? b.sourceDomain : b.targetDomain);

/** A monitored link is healthy while it's still on the page. */
export const isHealthy = (b: Backlink) => b.live;

/** Pulsing dot: green while monitored and healthy, amber when the last scan found a problem, grey once ended. */
export function PulseDot({ tone }: { tone: "ok" | "warn" | "off" }) {
  const color = tone === "ok" ? "bg-green-500" : tone === "warn" ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      {tone !== "off" && <span className={cn("absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping", color)} />}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}

/** The other side of the link. */
const partnerOf = (b: Backlink) => (b.direction === "given" ? b.targetDomain : b.sourceDomain);

/**
 * Header indicator for the daily link crawler, account-wide (every site's links). Only rendered when
 * there's at least one active link to watch. When a link goes missing it says so right in the header
 * and lists the missing links, each with the page it should be on.
 */
export function MonitoringIndicator() {
  const { backlinks } = useAppData();
  const active = backlinks.filter((b) => b.status === "active");
  if (active.length === 0) return null;

  const missing = active.filter((b) => !isHealthy(b));
  const lastRun = backlinks.reduce((a, b) => (b.lastScan > a ? b.lastScan : a), "");
  const alert = missing.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative h-9 gap-2 overflow-hidden rounded-full border px-2.5 sm:pr-3"
            aria-label={`Active monitoring: ${active.length} links${alert ? `, ${missing.length} missing` : ", all on the page"}`}
          />
        }
      >
        {/* Monitoring keeps running either way, so the pill stays green */}
        <span className="relative grid size-5 place-items-center">
          <span className="absolute inset-0 rounded-full bg-green-500/30 motion-safe:animate-ping" aria-hidden />
          <Radar className="relative size-4 text-green-600 dark:text-green-400" />
        </span>
        <span className="hidden text-[13px] sm:inline">
          Active monitoring <span className="text-muted-foreground tabular-nums">{active.length}</span>
        </span>
        {/* Missing links: a small amber warning at the far right */}
        {alert && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 tabular-nums dark:text-amber-400">
            <TriangleAlert className="size-3" aria-hidden />
            {missing.length}
          </span>
        )}
        {/* Scan line sweeping along the bottom edge */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden" aria-hidden>
          <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-green-500 to-transparent motion-safe:animate-scan" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-96">
        <div className="flex flex-col gap-3 px-2 py-2">
          <div className="flex items-center gap-2">
            <PulseDot tone="ok" />
            <span className="text-sm font-medium">Active monitoring</span>
            <span className="ml-auto text-xs text-muted-foreground">All your sites</span>
          </div>
          <p className="text-xs text-muted-foreground">Every active link on every site is crawled daily to confirm it&apos;s still on the page.</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Watching" value={active.length} />
            <Stat label="Dofollow" value={active.length - missing.length} className="text-green-700 dark:text-green-400" />
            <Stat label="Missing" value={missing.length} className={alert ? "text-amber-700 dark:text-amber-400" : undefined} />
          </div>
          <span className="text-xs text-muted-foreground">
            Last run <DateTime iso={lastRun} className="text-foreground tabular-nums" />
          </span>
        </div>

        {alert && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-3.5" aria-hidden />
              {missing.length === 1 ? "This link is gone" : `These ${missing.length} links are gone`}
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {missing.map((b) => {
                const c = missingCase(b)!;
                return (
                  <li key={b.id}>
                    <DropdownMenuItem
                      render={<Link href={`/backlinks?state=missing&case=${b.id}`} />}
                      className="flex-col items-start gap-1"
                    >
                      <span className="flex w-full items-center gap-1.5 text-sm">
                        <SiteLabel domain={partnerOf(b)} className="font-medium" />
                        <span className="truncate text-xs text-muted-foreground">
                          {b.direction === "received" ? "→ your" : "← from your"} {yourSiteOf(b)}
                        </span>
                        <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                      </span>
                      <span className={cn("rounded-full border px-1.5 py-px text-[10px] font-medium", missingBadgeClass(c))}>{c.badge}</span>
                      <span className="text-[11px] whitespace-normal text-muted-foreground">{c.summary}</span>
                    </DropdownMenuItem>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Every link being watched: where it is, who it points to, and whether the last look found it */}
        <DropdownMenuSeparator />
        <div className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">Links we watch</div>
        <ul className="max-h-60 overflow-y-auto pb-1">
          {active.map((b) => (
            <li key={b.id}>
              <DropdownMenuItem render={<Link href="/backlinks" />} className="flex-col items-start gap-0.5">
                <span className="flex w-full items-center gap-2 text-[13px]">
                  <PulseDot tone={b.live ? "ok" : "warn"} />
                  <SiteLabel domain={b.sourceDomain} size={14} className="font-medium" />
                  <span className="truncate font-mono text-[11px] text-muted-foreground">{b.sourcePage === "/" ? "" : b.sourcePage}</span>
                </span>
                <span className="flex w-full items-center gap-1.5 pl-4 text-xs text-muted-foreground">
                  <ArrowRight className="size-3 shrink-0" />
                  <SiteLabel domain={b.targetDomain} size={12} className="text-foreground/80" />
                  <span className="truncate">“{b.anchor}”</span>
                  <span className="ml-auto shrink-0 rounded-full border px-1.5 py-px text-[10px]">{b.direction === "given" ? "you give" : "you get"}</span>
                </span>
              </DropdownMenuItem>
            </li>
          ))}
        </ul>

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={alert ? "/backlinks?state=missing" : "/backlinks"} />}>
          {alert ? "Review missing links" : "View backlinks"} <ArrowRight className="ml-auto size-3.5" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", className)}>{value}</span>
    </div>
  );
}
