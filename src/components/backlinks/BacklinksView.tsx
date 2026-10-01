"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { BacklinksList } from "@/lib/list-types";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Link2, SearchX, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PulseDot, yourSiteOf } from "@/components/backlinks/monitoring";
import { MissingLinkSheet, missingBadgeClass } from "@/components/backlinks/MissingLinkSheet";
import { missingCase } from "@/lib/missing-links";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimpleSelect, toOptions } from "@/components/shared/SimpleSelect";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { DateTime } from "@/components/shared/DateTime";
import { AddedCell } from "@/components/shared/AddedCell";
import { SearchInput } from "@/components/shared/SearchInput";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { nextSort } from "@/lib/list-params";
import { partnerOf, standingOf, type Standing } from "@/lib/backlinks-list";
import { categories, categoryLabels, durationLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Backlink } from "@/lib/types";

type Direction = Backlink["direction"];
type SortKey = "partner" | "dr" | "scan" | "added";

const directions: Record<Direction, { label: string; flow: string; icon: LucideIcon }> = {
  given: { label: "Given", flow: "Your site → their site", icon: ArrowUpRight },
  received: { label: "Received", flow: "Their site → your site", icon: ArrowDownLeft },
};

/* ---------- where a link stands, as measured by the last scan ---------- */


const standings: Record<Standing, { label: string; note: string; className: string; dot: "ok" | "warn" }> = {
  dofollow: {
    label: "Active",
    note: "live on the page, dofollow, checked daily",
    className: "border-green-600/30 bg-green-600/15 text-green-700 dark:text-green-400",
    dot: "ok",
  },
  missing: {
    label: "Missing",
    note: "the page was read and the link is gone",
    className: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400",
    dot: "warn",
  },
};

/** Which way the link points: Received (their site → yours) or Given (yours → theirs). */
function DirectionTag({ direction }: { direction: Direction }) {
  const { label, flow, icon: Icon } = directions[direction];
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
          direction === "received" ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" : "bg-muted/50",
        )}
      >
        <Icon className="size-3" /> {label}
      </span>
      <span className="text-[11px] text-muted-foreground">{flow}</span>
    </div>
  );
}

/** The other side of the link. */
const pageUrl = (b: Backlink) => `https://${b.sourceDomain}${b.sourcePage}`;

const drTone = (dr: number) =>
  dr >= 60 ? "text-green-700 dark:text-green-400" : dr >= 30 ? "text-foreground" : "text-muted-foreground";

export function BacklinksView(initial: BacklinksList) {
  const { data: live } = useLiveList("backlinks", initial);
  const { rows, total, page, pageSize, totalAll, summary, openCase, yours, filters, knownOfferIds } = live;
  const { set, clear, pending } = useListParams();
  const { q: query, direction, standing, category, sort } = filters;
  const pageRows = rows;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clearFilters = () => clear(["q", "direction", "state", "category"]);
  const onSort = (key: SortKey) => set(nextSort(sort, key, key === "partner" ? "asc" : "desc"));

  // Summary for the selected direction (all links by default)
  const { liveLinks, strong, avgDr, expiring, missing, penalizedCount } = summary;
  const cards = [
    { label: "Dofollow links", value: liveLinks, hint: `${strong} from DR 30+`, tone: "text-green-700 dark:text-green-400" },
    { label: "Average partner DR", value: avgDr || "—", hint: "across dofollow links" },
    { label: "Expiring in 30 days", value: expiring, hint: "renew or replace before they end", tone: expiring ? "text-amber-700 dark:text-amber-400" : "" },
    {
      label: "Missing",
      value: missing,
      hint: missing ? `${penalizedCount} penalized · ${missing - penalizedCount} waiting to be restored` : "page read, link gone",
      tone: missing ? "text-red-700 dark:text-red-400" : "",
    },
  ];

  if (totalAll === 0) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader title="Backlinks" description="Every page is opened and read daily, so a removed link shows up here." />
        <EmptyState
          bordered
          icon={Link2}
          title="No backlinks yet"
          description="Once a deal is delivered, the link appears here and we scan it daily to confirm it's still on the page."
          action={
            <>
              <Link href="/markets/exchange" className={cn(buttonVariants(), "rounded-full")}>
                Find an exchange
              </Link>
              <Link href="/markets/paid" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
                Browse Paid Market
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader title="Backlinks" description="Every page is opened and read daily, so a removed link shows up here." />

      {/* ---- summary ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-[13px] text-muted-foreground">{c.label}</span>
              <span className={cn("text-2xl font-[450] tracking-tight tabular-nums", c.tone)}>{c.value}</span>
              <span className="truncate text-xs text-muted-foreground">{c.hint}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---- filters ---- */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 md:flex-row md:items-center">
        <SearchInput value={query} placeholder="Search partner, page, anchor or offer ID…" />
        <SimpleSelect
          className="md:w-44"
          value={direction}
          onChange={(v) => set({ direction: v === "all" ? null : v })}
          options={[
            { value: "all", label: "All directions" },
            { value: "received", label: "Received" },
            { value: "given", label: "Given" },
          ]}
        />
        <SimpleSelect
          className="md:w-44"
          value={category}
          onChange={(v) => set({ category: v === "all" ? null : v })}
          options={[{ value: "all", label: "All categories" }, ...toOptions(categories, categoryLabels)]}
        />
        <SimpleSelect
          className="md:w-44"
          value={standing}
          onChange={(v) => set({ state: v === "all" ? null : v })}
          options={[
            { value: "all", label: "All states" },
            ...(Object.keys(standings) as Standing[]).map((s) => ({ value: s, label: standings[s].label })),
            { value: "ended", label: "Ended" },
          ]}
        />
      </div>

      {/* ---- table ---- */}
      <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">
                <SortHeader label="Partner" sortKey="partner" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead className="hidden sm:table-cell">Direction</TableHead>
              <TableHead>
                <SortHeader label="Their DR" sortKey="dr" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead>Where it stands</TableHead>
              <TableHead className="hidden md:table-cell">Anchor & page</TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortHeader label="Last scan" sortKey="scan" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <SortHeader label="Added" sortKey="added" sort={sort} onSort={onSort} />
              </TableHead>
              <TableHead className="pr-4">
                <span className="sr-only">Open link</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((b) => {
              const st = standings[standingOf(b)];
              const ended = b.status === "completed";
              const mc = missingCase(b);
              return (
                <TableRow key={b.id} className={cn(b.status === "completed" && "opacity-60")}>
                  {/* Partner: who's on the other side, plus market, category and the deal it came from */}
                  <TableCell className="pl-4">
                    <div className="flex flex-col gap-1">
                      <SiteLabel domain={partnerOf(b)} className="font-medium" />
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MarketBadge market={b.market} icon className="h-5 px-1.5 text-[11px]" />
                        {categoryLabels[b.category]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {b.direction === "given" ? "from" : "to"} {yourSiteOf(b)} ·{" "}
                        {knownOfferIds.includes(b.offerId) ? (
                          <Link href={`/offers/${b.offerRef}`} className="font-mono underline-offset-2 hover:underline">
                            {b.offerRef}
                          </Link>
                        ) : (
                          <span className="font-mono" title="Archived offer">
                            {b.offerId}
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <DirectionTag direction={b.direction} />
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-base font-medium tabular-nums", drTone(b.partnerDr))}>{b.partnerDr}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col gap-1">
                      {ended ? (
                        <>
                          <Badge variant="outline" className="w-fit gap-1.5 rounded-full border-border bg-muted font-normal text-muted-foreground">
                            <PulseDot tone="off" />
                            Ended
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            term ended · no longer monitored
                          </span>
                        </>
                      ) : mc ? (
                        // Missing: the stage in the badge, one line of what happens, and the full story in a side panel
                        <>
                          <Badge variant="outline" className={cn("w-fit gap-1.5 rounded-full font-normal", missingBadgeClass(mc))}>
                            <PulseDot tone="warn" />
                            {mc.badge}
                          </Badge>
                          <span className="line-clamp-2 max-w-64 text-xs text-muted-foreground">{mc.summary}</span>
                          <button
                            type="button"
                            onClick={() => set({ case: b.id, page: page > 1 ? page : null })}
                            className="w-fit text-left text-xs font-medium whitespace-nowrap underline-offset-2 hover:underline"
                          >
                            {mc.canRemoveYours ? "Remove yours →" : "What happened →"}
                          </button>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className={cn("w-fit gap-1.5 rounded-full font-normal", st.className)}>
                            <PulseDot tone={st.dot} />
                            {st.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{st.note}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-72 md:table-cell">
                    <div className="flex flex-col gap-1">
                      <span className="truncate">&ldquo;{b.anchor}&rdquo;</span>
                      <a
                        href={pageUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        title={pageUrl(b)}
                      >
                        {b.sourceDomain}
                        {b.sourcePage}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-col">
                      <span className="flex flex-col whitespace-nowrap">
                        <DateTime iso={b.lastScan} part="date" className="text-muted-foreground tabular-nums" />
                        <DateTime iso={b.lastScan} part="time" className="text-xs text-muted-foreground tabular-nums" />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {durationLabels[b.duration]} ·{" "}
                        {b.status === "completed" ? "completed" : b.daysLeft === null ? "no expiry" : `${b.daysLeft} days left`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <AddedCell date={b.addedAt} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <a
                      href={pageUrl(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8 rounded-full")}
                      aria-label={`Open ${pageUrl(b)} in a new tab`}
                      title="Open the page with the link"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="p-0 whitespace-normal">
                  <EmptyState
                    compact
                    icon={SearchX}
                    title="No links match"
                    description="Try another search or clear the filters."
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
      <MissingLinkSheet
        link={openCase}
        onOpenChange={(open) => !open && set({ case: null, page: page > 1 ? page : null })}
        yours={yours}
      />
    </div>
  );
}
