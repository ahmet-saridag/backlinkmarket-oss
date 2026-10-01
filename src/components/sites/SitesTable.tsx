"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { SitesList } from "@/lib/list-types";
import Link from "next/link";
import { ChevronRight, Globe, Plus, SearchX } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { DateTime } from "@/components/shared/DateTime";
import { AddedCell } from "@/components/shared/AddedCell";
import { SearchInput } from "@/components/shared/SearchInput";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { nextSort } from "@/lib/list-params";
import { SiteStatusBadge } from "@/components/sites/SiteStatusBadge";
import { formatNumber } from "@/lib/labels";
import { trafficRangeLabelFor } from "@/lib/traffic-ranges";
import { cn } from "@/lib/utils";

type SortKey = "domain" | "dr" | "traffic" | "added";

/** My Sites list. The server searches, filters, sorts and pages; this shows one page and writes the state to the URL. Rows open the site's detail page, where Edit and Delete live. */
export function SitesTable(initial: SitesList) {
  const { data: live } = useLiveList("sites", initial);
  const { sites, total, totalAll, page, pageSize, q, status, market, sort } = live;
  const { set, clear, pending } = useListParams();
  const pageRows = sites;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = !!q || status !== "all" || market !== "all";
  const onSort = (key: SortKey) => set(nextSort(sort, key, key === "domain" ? "asc" : "desc"));
  const clearFilters = () => clear(["q", "status", "market"]);

  if (totalAll === 0) {
    return (
      <EmptyState
        bordered
        icon={Globe}
        title="Add your first site"
        description="You need a verified site to list in a market, send offers or join the ABC pool. It takes a couple of minutes."
        action={
          <Link href="/sites/new" className={cn(buttonVariants(), "rounded-full")}>
            <Plus className="size-4" /> Add Site
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 md:flex-row md:items-center">
        <SearchInput value={q} placeholder="Search your sites…" />
        <SimpleSelect
          className="md:w-44"
          value={market}
          onChange={(v) => set({ market: v === "all" ? null : v })}
          options={[
            { value: "all", label: "All markets" },
            { value: "paid", label: "Paid" },
            { value: "exchange", label: "Exchange" },
            { value: "abc", label: "ABC" },
          ]}
        />
        <SimpleSelect
          className="md:w-40"
          value={status}
          onChange={(v) => set({ status: v === "all" ? null : v })}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
          ]}
        />
      </div>

      <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">
                <SortHeader label="Domain" sortKey="domain" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="DR" sortKey="dr" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortHeader label="Traffic" sortKey="traffic" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead>Markets</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortHeader label="Added" sortKey="added" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead className="pr-4">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((s) => (
              <TableRow key={s.id} className="relative cursor-pointer">
                <TableCell className="pl-4 font-medium">
                  {/* The link covers the whole row */}
                  <Link href={`/sites/${s.domain}`} className="after:absolute after:inset-0 hover:underline">
                    <SiteLabel domain={s.domain} />
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {s.dr}
                  {s.drCheckedAt && (
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      read <DateTime iso={s.drCheckedAt} />
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden tabular-nums md:table-cell">{trafficRangeLabelFor(s.traffic) ?? `${formatNumber(s.traffic)}/mo`}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.markets.map((m) => (
                      <MarketBadge key={m} market={m} />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <SiteStatusBadge status={s.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <AddedCell date={s.createdAt} />
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0 whitespace-normal">
                  <EmptyState
                    compact
                    icon={SearchX}
                    title="No sites match"
                    description={hasFilters ? "Try another search or clear the filters." : undefined}
                    action={
                      <Button variant="outline" size="sm" className="rounded-full" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          total={total}
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageChange={(n) => set({ page: n > 1 ? n : null })}
          onPageSizeChange={(n) => set({ pageSize: n === 10 ? null : n, page: null })}
        />
      </div>
    </div>
  );
}
