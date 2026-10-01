"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { PaidList } from "@/lib/list-types";
import { useState } from "react";
import { LayoutGrid, Rows3, SearchX, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddedCell } from "@/components/shared/AddedCell";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { SearchInput } from "@/components/shared/SearchInput";
import { SimpleSelect, toOptions } from "@/components/shared/SimpleSelect";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { OfferCreateLink } from "@/components/standing/OfferCreateLink";
import { countryFlag } from "@/lib/flags";
import { PaysVia } from "@/components/markets/PaysVia";
import { daysAgo, DrValue, drPresetOptions, drPresetValue, SellerCell, trafficPresetOptions, ViewBtn } from "@/components/markets/market-ui";
import { categoryLabels, categories, countries, formatUsd, niches } from "@/lib/labels";
import { nextSort } from "@/lib/list-params";
import { finalPrice, listing, priceFor } from "@/lib/market-price";
import { displayTraffic } from "@/lib/traffic-ranges";
import { cn } from "@/lib/utils";
import type { MarketQuery } from "@/lib/market-data";
import type { Category } from "@/lib/types";

const CATS = categories as Category[];
const shortCat: Record<Category, string> = { guest_post: "Guest post", link_insertion: "Insertion", review: "Review", footer_link: "Footer" };

type SortKey = MarketQuery["sort"];

const PRICE_OPTIONS = [
  { value: "0", label: "Any price" },
  { value: "100", label: "Up to $100" },
  { value: "250", label: "Up to $250" },
  { value: "500", label: "Up to $500" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "dr", label: "Highest DR" },
  { value: "traffic", label: "Most traffic" },
  { value: "price", label: "Lowest price" },
  { value: "value", label: "Best value (DR per $)" },
  { value: "newest", label: "Newest listings" },
];

/**
 * Paid Market, in the same list look as Backlinks. The server does all the searching, filtering,
 * sorting and paging — this view only shows one page and writes the state to the URL.
 */
export function PaidMarketView(initial: PaidList) {
  const { data: live } = useLiveList("paid", initial);
  const { sites, total, totalAll, page, pageSize, filters } = live;
  const { set, clear, pending } = useListParams();
  const { q: query, drMin, drMax, trafficMin, priceMax, categories: cats, niches: nicheSel, country, sort, dir } = filters;
  const [view, setView] = useState<"table" | "grid">("table");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const cat = cats[0] ?? "all";

  const hasFilters = !!query || drMin > 0 || drMax < 100 || trafficMin > 0 || priceMax > 0 || cats.length > 0 || nicheSel.length > 0 || country !== "all";
  const clearAll = () => clear(["q", "drMin", "drMax", "trafficMin", "priceMax", "cats", "niches", "country"]);
  const onSort = (key: SortKey) => set(nextSort({ key: sort, dir }, key, key === "price" ? "asc" : "desc"));
  const drValue = drPresetValue(drMin, drMax);

  if (totalAll === 0) {
    return <EmptyState bordered icon={Store} title="No sites for sale yet" description="New listings appear here as sellers verify their sites." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---- filters ---- */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={query} placeholder="Search domain or seller…" />
          <SimpleSelect className="md:w-40" value={cat} onChange={(v) => set({ cats: v === "all" ? null : [v] })} options={[{ value: "all", label: "All categories" }, ...CATS.map((c) => ({ value: c, label: categoryLabels[c] }))]} />
          <SimpleSelect className="md:w-44" value={nicheSel[0] ?? "all"} onChange={(v) => set({ niches: v === "all" ? null : [v] })} options={[{ value: "all", label: "All niches" }, ...toOptions(niches)]} />
          <SimpleSelect className="md:w-44" value={country} onChange={(v) => set({ country: v === "all" ? null : v })} options={[{ value: "all", label: "All countries" }, ...countries.map((c) => ({ value: c, label: `${countryFlag(c)} ${c}` }))]} />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SimpleSelect
            className="md:w-40"
            value={drValue}
            onChange={(v) => {
              const [lo, hi] = v === "all" ? [0, 100] : v.split("-").map(Number);
              set({ drMin: lo || null, drMax: hi >= 100 ? null : hi });
            }}
            options={drPresetValue(drMin, drMax) === "all" || drPresetOptions.some((o) => o.value === drValue) ? drPresetOptions : [...drPresetOptions, { value: drValue, label: `DR ${drMin}–${drMax}` }]}
          />
          <SimpleSelect className="md:w-44" value={String(trafficMin)} onChange={(v) => set({ trafficMin: Number(v) || null })} options={trafficPresetOptions} />
          <SimpleSelect className="md:w-40" value={String(priceMax)} onChange={(v) => set({ priceMax: Number(v) || null })} options={PRICE_OPTIONS} />
          <SimpleSelect className="md:w-52" value={sort} onChange={(v) => set({ sort: v === "dr" ? null : v, dir: null })} options={SORT_OPTIONS} />
          {hasFilters && (
            <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={clearAll}>
              <X className="size-3.5" /> Clear all
            </Button>
          )}
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="text-xs text-muted-foreground tabular-nums">
              {total.toLocaleString("en-US")} of {totalAll.toLocaleString("en-US")} sites
            </span>
            <div className="flex rounded-full border p-0.5" role="radiogroup" aria-label="View">
              <ViewBtn on={view === "table"} onClick={() => setView("table")} label="Table view">
                <Rows3 className="size-4" />
              </ViewBtn>
              <ViewBtn on={view === "grid"} onClick={() => setView("grid")} label="Grid view">
                <LayoutGrid className="size-4" />
              </ViewBtn>
            </div>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          bordered
          icon={SearchX}
          title="No sites match these filters"
          description="Widen the DR range, lower the traffic minimum or raise the price."
          action={
            <Button variant="outline" size="sm" className="rounded-full" onClick={clearAll}>
              Clear all filters
            </Button>
          }
        />
      ) : view === "table" ? (
        <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Site</TableHead>
                <TableHead className="hidden lg:table-cell">Seller</TableHead>
                <TableHead className="hidden lg:table-cell">Pays via</TableHead>
                <TableHead>
                  <SortHeader label="DR" sortKey="dr" sort={{ key: sort, dir }} onSort={onSort} />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortHeader label="Traffic" sortKey="traffic" sort={{ key: sort, dir }} onSort={onSort} />
                </TableHead>
                {CATS.map((c) => (
                  <TableHead key={c} className={cn("hidden text-right md:table-cell", cats.includes(c) && "text-foreground")}>
                    {c === "guest_post" ? <SortHeader label="Guest post" sortKey="price" sort={{ key: sort, dir }} onSort={onSort} align="right" /> : shortCat[c]}
                  </TableHead>
                ))}
                <TableHead className="hidden xl:table-cell">
                  <SortHeader label="Added" sortKey="newest" sort={{ key: sort, dir }} onSort={onSort} />
                </TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Offer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5">
                        <SiteLabel domain={s.domain} className="max-w-56 font-medium" />
                        {daysAgo(s.listedAt) <= 14 && <span className="rounded-full bg-sky-500/15 px-1.5 text-[10px] font-medium text-sky-700 dark:text-sky-400">New</span>}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MarketBadge market="paid" icon className="h-5 px-1.5 text-[11px]" />
                        {countryFlag(s.country)} {s.niches.slice(0, 2).join(" · ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.language} · {s.sitemapPageCount.toLocaleString("en-US")} pages
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <SellerCell site={s} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <PaysVia seller={s.seller} />
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
                  {CATS.map((c) => {
                    const l = listing(s, c);
                    return (
                      <TableCell key={c} className={cn("hidden text-right tabular-nums md:table-cell", cats.includes(c) && "bg-foreground/[0.04]")}>
                        {l ? (
                          <span className="flex flex-col items-end">
                            <span className="font-medium">{formatUsd(finalPrice(l))}</span>
                            {l.discountPct > 0 && <span className="text-[10px] text-green-700 dark:text-green-400">−{l.discountPct}%</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="hidden xl:table-cell">
                    <AddedCell date={s.listedAt ?? ""} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <OfferCreateLink href={`/markets/paid/${s.domain}/offer`} size="sm">
                      <span className="md:hidden">{formatUsd(priceFor(s, cats))}</span>
                      <span className="hidden md:inline">Offer</span>
                    </OfferCreateLink>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            total={total}
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            onPageChange={(n) => set({ page: n > 1 ? n : null })}
            onPageSizeChange={(n) => set({ pageSize: n === 25 ? null : n, page: null })}
          />
        </div>
      ) : (
        <>
          <div className={cn("grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3", pending && "opacity-60")}>
            {sites.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <SiteLabel domain={s.domain} className="font-medium" />
                    <span className="pl-5 text-[11px] text-muted-foreground">
                      {countryFlag(s.country)} {s.niches.slice(0, 2).join(" · ")} · added {s.listedAt?.slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex gap-3 text-right">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground">DR</span>
                      <DrValue dr={s.dr} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground">Traffic</span>
                      <span className="text-base font-medium tabular-nums">{displayTraffic(s.traffic)}</span>
                    </div>
                  </div>
                </div>
                <SellerCell site={s} />
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/40 p-1.5 text-center">
                  {CATS.map((c) => {
                    const l = listing(s, c);
                    return (
                      <div key={c} className={cn("flex flex-col rounded-lg py-1", cats.includes(c) && "bg-card")}>
                        <span className="text-[10px] text-muted-foreground">{shortCat[c]}</span>
                        <span className={cn("text-[13px] font-medium tabular-nums", !l && "text-muted-foreground/50")}>{l ? formatUsd(finalPrice(l)) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
                <OfferCreateLink href={`/markets/paid/${s.domain}/offer`} size="sm" className="w-full">
                  Make offer
                </OfferCreateLink>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <TablePagination
              total={total}
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              onPageChange={(n) => set({ page: n > 1 ? n : null })}
              onPageSizeChange={(n) => set({ pageSize: n === 25 ? null : n, page: null })}
            />
          </div>
        </>
      )}
    </div>
  );
}
