"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { ExchangeList } from "@/lib/list-types";
import Link from "next/link";
import { ArrowLeftRight, SearchX, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddedCell } from "@/components/shared/AddedCell";
import { Callout } from "@/components/shared/Callout";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { SearchInput } from "@/components/shared/SearchInput";
import { SimpleSelect, toOptions } from "@/components/shared/SimpleSelect";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { OfferCreateLink } from "@/components/standing/OfferCreateLink";
import { DrValue, SellerCell, drPresetOptions, drPresetValue } from "@/components/markets/market-ui";
import { countryFlag } from "@/lib/flags";
import { niches } from "@/lib/labels";
import { nextSort } from "@/lib/list-params";
import { displayTraffic } from "@/lib/traffic-ranges";
import { cn } from "@/lib/utils";

const trafficRange = ([min, max]: [number, number | null]) => (min === 0 && max === null ? "any traffic" : `${displayTraffic(min)}–${max === null ? "∞" : displayTraffic(max)}`);

type SortKey = "dr" | "traffic" | "newest";

/** Every site open to link swaps, in the same list look as Backlinks. The server searches, filters, sorts and pages. */
export function ExchangeMarketView(initial: ExchangeList) {
  const { data: live } = useLiveList("exchange", initial);
  const { sites, total, totalAll, page, pageSize, filters, fitOnly, fits, hasSites } = live;
  const { set, clear, pending } = useListParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const sort = { key: filters.sort as SortKey, dir: filters.dir };
  const onSort = (key: SortKey) => set(nextSort(sort, key, "desc"));
  const drValue = drPresetValue(filters.drMin, filters.drMax);
  const hasFilters = !!filters.q || fitOnly || filters.niches.length > 0 || filters.drMin > 0 || filters.drMax < 100;

  return (
    <div className="flex flex-col gap-4">
      {!hasSites && (
        <Callout variant="warning" title="List a site in Exchange first">
          A swap needs a link from your site too. Add a site or open one of yours to Exchange in{" "}
          <Link href="/sites" className="underline">
            My Sites
          </Link>
          .
        </Callout>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 md:flex-row md:items-center">
        <SearchInput value={filters.q} placeholder="Search domains or owners…" />
        <SimpleSelect className="md:w-44" value={filters.niches[0] ?? "all"} onChange={(v) => set({ niches: v === "all" ? null : [v] })} options={[{ value: "all", label: "All niches" }, ...toOptions(niches)]} />
        <SimpleSelect
          className="md:w-40"
          value={drValue}
          onChange={(v) => {
            const [lo, hi] = v === "all" ? [0, 100] : v.split("-").map(Number);
            set({ drMin: lo || null, drMax: hi >= 100 ? null : hi });
          }}
          options={drPresetOptions.some((o) => o.value === drValue) ? drPresetOptions : [...drPresetOptions, { value: drValue, label: `DR ${filters.drMin}–${filters.drMax}` }]}
        />
        <SimpleSelect
          className="md:w-44"
          value={fitOnly ? "fit" : "all"}
          onChange={(v) => set({ fit: v === "fit" ? "1" : null })}
          options={[
            { value: "all", label: "All sites" },
            { value: "fit", label: "Fits one of my sites" },
          ]}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => clear(["q", "fit", "niches", "drMin", "drMax"])}>
            <X className="size-3.5" /> Clear all
          </Button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums md:ml-auto">
          {total.toLocaleString("en-US")} of {totalAll.toLocaleString("en-US")} sites
        </span>
      </div>

      {total === 0 ? (
        <EmptyState
          bordered
          icon={totalAll === 0 ? ArrowLeftRight : SearchX}
          title={totalAll === 0 ? "No sites in Exchange yet" : "Nothing matches"}
          description={totalAll === 0 ? "Sites from other accounts show up here once they open to link swaps." : "Try clearing a filter."}
        />
      ) : (
        <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Site</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead>
                  <SortHeader label="DR" sortKey="dr" sort={sort} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortHeader label="Traffic" sortKey="traffic" sort={sort} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden md:table-cell">Accepts</TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortHeader label="Added" sortKey="newest" sort={sort} onSort={onSort} />
                </TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Swap</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => {
                const ok = fits[s.id];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4">
                      <div className="flex flex-col gap-1">
                        <SiteLabel domain={s.domain} className="max-w-56 font-medium" />
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MarketBadge market="exchange" icon className="h-5 px-1.5 text-[11px]" />
                          {countryFlag(s.country)} {s.niches.slice(0, 2).join(" · ")}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.language}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <SellerCell site={s} />
                    </TableCell>
                    <TableCell>
                      <DrValue dr={s.dr} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col">
                        <span className="font-medium tabular-nums">{displayTraffic(s.traffic)}</span>
                        <span className="text-xs text-muted-foreground">organic / month</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="tabular-nums">
                          DR {s.acceptedDr[0]}–{s.acceptedDr[1]}
                        </span>
                        <span className="text-xs text-muted-foreground">{trafficRange(s.acceptedTraffic)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <AddedCell date={s.listedAt ?? ""} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {!hasSites ? null : ok ? (
                        <OfferCreateLink href={`/markets/exchange/${s.domain}/offer`} size="sm">
                          Propose swap
                        </OfferCreateLink>
                      ) : (
                        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none rounded-full opacity-50")}>Out of range</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={total}
            onPageChange={(n) => set({ page: n > 1 ? n : null })}
            onPageSizeChange={(n) => set({ pageSize: n === 25 ? null : n, page: null })}
          />
        </div>
      )}
    </div>
  );
}
