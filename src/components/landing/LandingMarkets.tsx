"use client";

import { useLiveList, usePrefetchList } from "@/lib/query/use-live-list";
import { searchWith } from "@/lib/query/url-state";
import type { LandingList } from "@/lib/list-types";
import { displayTraffic } from "@/lib/traffic-ranges";
import { Fragment, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, Circle, DollarSign, Layers, SearchX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { PublicHeader } from "@/components/landing/public-ui";
import { EngineStack, sponsor } from "@/components/layout/SponsorCard";
import { AddedCell } from "@/components/shared/AddedCell";
import { SimpleSelect, toOptions } from "@/components/shared/SimpleSelect";
import { SiteFavicon, SiteLabel } from "@/components/shared/SiteFavicon";
import { SearchInput } from "@/components/shared/SearchInput";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { nextSort } from "@/lib/list-params";
import { useListParams } from "@/components/shared/use-list-params";
import { niches } from "@/lib/labels";
import type { MarketQuery } from "@/lib/market-data";
import { DrValue, SellerCell, drPresetOptions, drPresetValue, trafficPresetOptions } from "@/components/markets/market-ui";
import { countryFlag } from "@/lib/flags";
import { formatUsd } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { MarketSite, MarketType } from "@/lib/types";

/** A real site listed in Paid Market. */
export type LandingRow = {
  kind: "site";
  id: string;
  site: MarketSite;
  dr: number;
  traffic: number;
  /** Cheapest placement after discounts */
  paidFrom?: number;
};

type MarketTab = "all" | MarketType;

const tabMeta: { id: MarketTab; label: string; icon: typeof Layers; tone: string }[] = [
  { id: "all", label: "All markets", icon: Layers, tone: "" },
  { id: "paid", label: "Paid", icon: DollarSign, tone: "text-blue-600 dark:text-blue-400" },
  { id: "exchange", label: "Exchange", icon: ArrowLeftRight, tone: "text-teal-600 dark:text-teal-400" },
  { id: "abc", label: "ABC pools", icon: Circle, tone: "text-violet-600 dark:text-violet-400" },
];

/** The market tabs in the public header; the tab lives in the URL so the server lists that market. */
function MarketTabs({ tab, counts }: { tab: MarketTab; counts: Record<MarketTab, number> }) {
  const { set } = useListParams();
  const prefetch = usePrefetchList("landing");
  // Only four tabs: fetch them all once the page is idle, so every click after that answers from memory
  useEffect(() => {
    const id = window.setTimeout(() => tabMeta.forEach((t) => prefetch(searchWith({ market: t.id === "all" ? null : t.id }))), 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1" role="tablist">
      {tabMeta.map(({ id, label, icon: Icon, tone }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => set({ market: id === "all" ? null : id })}
          // Warm the cache while the pointer is still on its way, so the click answers from memory
          onMouseEnter={() => prefetch(searchWith({ market: id === "all" ? null : id }))}
          onFocus={() => prefetch(searchWith({ market: id === "all" ? null : id }))}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors",
            tab === id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className={cn("size-3.5", tone)} />
          {label}
          <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{counts[id]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * The public market: Paid listings, Exchange partners and ABC pools in one list. Browsing is open;
 * any action (offer, swap, join) asks you to log in first. The server searches, filters, sorts and pages.
 */
export function LandingMarkets(initial: LandingList) {
  const { data: live } = useLiveList("landing", initial);
  const { rows, total, page, pageSize, filters, market, counts } = live;
  const { set, clear, pending } = useListParams();
  const router = useRouter();
  const detailHref = (r: LandingRow) => `/listing/${r.site.domain}`;

  const { q: query, drMin, drMax, trafficMin } = filters;
  const sort = filters.sort;
  const niche = filters.niches[0] ?? "all";
  const current = page;
  const pageRows = rows;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const drValue = drPresetValue(drMin, drMax);
  const sortState = { key: sort, dir: filters.dir };
  const onSort = (key: MarketQuery["sort"]) => set(nextSort(sortState, key, key === "price" ? "asc" : "desc"));
  const active = Number(drMin > 0 || drMax < 100) + Number(trafficMin > 0) + Number(niche !== "all");
  const clearAll = () => clear(["q", "drMin", "drMax", "trafficMin", "niches"]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar: brand and Google sign-in */}
      <PublicHeader center={<MarketTabs tab={market} counts={counts} />} />

      {/* Search, filters */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 md:flex-row md:items-center">
        <SearchInput value={query} placeholder="Search a domain or seller…" />
        <SimpleSelect className="md:w-44" value={niche} onChange={(v) => set({ niches: v === "all" ? null : [v] })} options={[{ value: "all", label: "All niches" }, ...toOptions(niches)]} />
        <SimpleSelect
          className="md:w-40"
          value={drValue}
          onChange={(v) => {
            const [lo, hi] = v === "all" ? [0, 100] : v.split("-").map(Number);
            set({ drMin: lo || null, drMax: hi >= 100 ? null : hi });
          }}
          options={drPresetOptions.some((o) => o.value === drValue) ? drPresetOptions : [...drPresetOptions, { value: drValue, label: `DR ${drMin}–${drMax}` }]}
        />
        <SimpleSelect className="md:w-44" value={String(trafficMin)} onChange={(v) => set({ trafficMin: Number(v) || null })} options={trafficPresetOptions} />
        {active > 0 && (
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={clearAll}>
            <X className="size-3.5" /> Clear all
          </Button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums md:ml-auto">{total.toLocaleString("en-US")} listings</span>
      </div>

      {total === 0 ? (
        <EmptyState
          bordered
          icon={SearchX}
          title="Nothing matches"
          description="Widen the DR range or clear the filters."
          action={
            <Button variant="outline" size="sm" className="rounded-full" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Site</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead>
                  <SortHeader label="DR" sortKey="dr" sort={sortState} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortHeader label="Traffic" sortKey="traffic" sort={sortState} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortHeader label="Deal" sortKey="price" sort={sortState} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortHeader label="Added" sortKey="newest" sort={sortState} onSort={onSort} />
                </TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r, i) => (
                <Fragment key={`${r.kind}-${r.id}`}>
                  {/* One quiet sponsored row on the first page, after the first few listings */}
                  {i === SPONSOR_AFTER && current === 1 && <SponsorRow />}
                  <TableRow className="cursor-pointer" onClick={() => router.push(detailHref(r))}>
                    <TableCell className="pl-4">
                      <div className="flex flex-col gap-0.5">
                        <Link href={detailHref(r)} onClick={(e) => e.stopPropagation()} className="w-fit hover:underline">
                          <SiteLabel domain={r.site.domain} className="max-w-56 font-medium" />
                        </Link>
                        <span className="flex items-center gap-1.5 pl-5 text-[11px] text-muted-foreground">
                          {countryFlag(r.site.country)} {r.site.niches.slice(0, 2).join(" · ")}
                        </span>
                        <span className="flex items-center gap-2 pl-5 text-[11px] md:hidden">
                          {r.paidFrom !== undefined && (
                            <span className="flex items-center gap-0.5 text-blue-700 dark:text-blue-400">
                              <DollarSign className="size-3" /> from {formatUsd(r.paidFrom)}
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <SellerCell site={r.site} />
                    </TableCell>
                    <TableCell>
                      <DrValue dr={r.dr} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col">
                        <span className="font-medium tabular-nums">{displayTraffic(r.traffic)}</span>
                        <span className="text-xs text-muted-foreground">organic / month</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Deal row={r} tab={market} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <AddedCell date={r.site.listedAt ?? ""} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(detailHref(r));
                        }}
                      >
                        {market === "exchange" ? "Swap" : market === "abc" ? "Join" : r.paidFrom !== undefined ? "Offer" : "Swap"}
                      </Button>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
              {/* Few listings: the sponsored row still shows, once, at the end of the first page */}
              {pageRows.length <= SPONSOR_AFTER && current === 1 && <SponsorRow />}
            </TableBody>
          </Table>
          <TablePagination
            total={total}
            page={current}
            pageCount={pageCount}
            pageSize={pageSize}
            onPageChange={(n) => set({ page: n > 1 ? n : null })}
            onPageSizeChange={(n) => set({ pageSize: n === 25 ? null : n, page: null })}
          />
        </div>
      )}

    </div>
  );
}

const SPONSOR_AFTER = 6;

/** Bold Pilot, as one muted native row — clearly marked, no popups. */
function SponsorRow() {
  return (
    <TableRow className="bg-muted/25 hover:bg-muted/40">
      <TableCell colSpan={7} className="px-4 py-2.5">
        <a href={sponsor.href} target="_blank" rel="sponsored noopener" className="group flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="hidden sm:block">
            <EngineStack circle={24} />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
            <SiteFavicon domain={sponsor.domain} size={16} className="rounded-[4px]" />
            <span className="font-medium">{sponsor.name}</span>
            <span className="hidden truncate text-muted-foreground md:inline">{sponsor.pitch}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Ad</span>
            <span className="flex items-center gap-1 text-[13px] font-medium group-hover:underline">
              {sponsor.cta} <ArrowUpRight className="size-3.5 text-muted-foreground" />
            </span>
          </span>
        </a>
      </TableCell>
    </TableRow>
  );
}

/** What you can do with a listing: buy a placement, swap links, or join its pool. */
function Deal({ row: r, tab }: { row: LandingRow; tab: MarketTab }) {
  const m = r.site.markets;
  return (
    <div className="flex flex-col gap-0.5 text-[13px]">
      {m.includes("paid") && r.paidFrom !== undefined && tab !== "exchange" && tab !== "abc" && (
        <span className="flex items-center gap-1.5">
          <DollarSign className="size-3.5 text-blue-600 dark:text-blue-400" />
          from <span className="font-medium tabular-nums">{formatUsd(r.paidFrom)}</span>
        </span>
      )}
      {m.includes("exchange") && tab !== "paid" && tab !== "abc" && (
        <span className="flex items-center gap-1.5">
          <ArrowLeftRight className="size-3.5 text-teal-600 dark:text-teal-400" /> Link swap
        </span>
      )}
      {m.includes("abc") && tab !== "paid" && tab !== "exchange" && (
        <span className="flex items-center gap-1.5">
          <Circle className="size-3.5 text-violet-600 dark:text-violet-400" /> ABC pool
        </span>
      )}
    </div>
  );
}
