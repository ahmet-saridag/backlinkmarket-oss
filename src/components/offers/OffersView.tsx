"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { OffersList } from "@/lib/list-types";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Handshake, Layers, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { OfferStatusBadge } from "@/components/shared/OfferStatusBadge";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { AddedCell } from "@/components/shared/AddedCell";
import { SearchInput } from "@/components/shared/SearchInput";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { DrChange, useHeaderSite } from "@/components/sites/SitesDrIndicator";
import { setHeaderSite } from "@/components/sites/selected-site";
import { categoryLabels, formatUsd } from "@/lib/labels";
import { actionLabel, isLiveLink, nextStep, offerStage, stageMeta, type OfferStage } from "@/lib/offer-stage";
import { nextSort } from "@/lib/list-params";
import type { SiteStats } from "@/lib/offers-list";
import { cn } from "@/lib/utils";

type SortKey = "created" | "amount";
const STAGES: OfferStage[] = ["action", "waiting", "live", "closed"];

const stageTone: Record<OfferStage, string> = {
  action: "text-amber-700 dark:text-amber-400",
  waiting: "text-sky-700 dark:text-sky-400",
  live: "text-green-700 dark:text-green-400",
  closed: "text-muted-foreground",
};

/**
 * Offers, organised by your sites. Built for accounts with dozens of sites:
 * a searchable site rail ranked by what needs you, and the selected site's offers on the right.
 * The selected site is shared with the header's site picker. The server ranks the sites and
 * searches, filters, sorts and pages the offers; this view shows the result and writes to the URL.
 */
export function OffersView(initial: OffersList) {
  const { data: live } = useLiveList("offers", initial);
  const { offers, total, page, pageSize, totalOffers, siteCount, rail, selectedSiteId, selected, stageCounts, inFlight, scopedCount, filters } = live;
  const { site: headerSite } = useHeaderSite();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { set, clear, pending } = useListParams();
  const { siteQuery, onlyAction, showIdle, stage, direction, market, q: query, sort } = filters;
  const site = selected?.site ?? null;
  const { withOffers, idle, totalAction } = rail;

  // Keep the URL's site and the header's site picker in step: the header is remembered per browser,
  // so on a fresh visit it decides; after that whichever one changed last wins.
  const headerId = headerSite === undefined ? "" : headerSite === null ? "all" : headerSite.id;
  const lastHeader = useRef<string | null>(null);
  useEffect(() => {
    if (headerSite === undefined) return;
    const urlId = selectedSiteId ?? "all";
    if (lastHeader.current === null) {
      lastHeader.current = headerId;
      if (urlId !== headerId && !searchParams.has("site")) set({ site: headerId });
      else if (urlId !== headerId) setHeaderSite(urlId);
      return;
    }
    if (headerId !== lastHeader.current) {
      lastHeader.current = headerId;
      if (headerId !== urlId) set({ site: headerId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerId, selectedSiteId]);

  const pickSite = (id: string) => {
    lastHeader.current = id;
    setHeaderSite(id);
    set({ site: id });
  };

  const pageRows = offers;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const stageCount = (st: OfferStage) => stageCounts[st];
  const clearFilters = () => clear(["stage", "direction", "market", "q"]);
  const onSort = (key: SortKey) => set(nextSort(sort, key, "desc"));
  const stats: SiteStats[] = [...withOffers, ...idle];

  if (totalOffers === 0 || siteCount === 0) {
    return (
      <EmptyState
        bordered
        icon={Handshake}
        title="No offers yet"
        description="Offers you send or receive in the Paid, Exchange and ABC markets are tracked here, per site."
        action={
          <>
            <Link href="/markets/paid" className={cn(buttonVariants(), "rounded-full")}>
              Browse Paid Market
            </Link>
            <Link href="/markets/exchange" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
              Find an exchange
            </Link>
          </>
        }
      />
    );
  }

  const selectedStats = selected;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* ================= Site rail (desktop) ================= */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-col gap-2 border-b p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">Your sites</span>
              <span className="text-xs text-muted-foreground tabular-nums">{siteCount}</span>
            </div>
            <SearchInput value={siteQuery} placeholder="Find a site…" param="sq" compact />
            <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              Only sites that need me
              <Switch checked={onlyAction} onCheckedChange={(v) => set({ act: v ? "1" : null })} size="sm" />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-1">
            <SiteRow
              active={site === null}
              onClick={() => pickSite("all")}
              icon={<Layers className="size-4 text-muted-foreground" />}
              label="All sites"
              sub={`${totalOffers} offers`}
              action={totalAction}
            />
            <div className="my-1.5 h-px bg-border" />
            {withOffers.map((s) => (
              <SiteRow
                key={s.site.id}
                active={site?.id === s.site.id}
                onClick={() => pickSite(s.site.id)}
                domain={s.site.domain}
                sub={`${s.open} open · ${s.total} total`}
                action={s.action}
                muted={s.site.status === "paused"}
              />
            ))}
            {withOffers.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No sites match.</p>
            )}
            {idle.length > 0 && !onlyAction && (
              <>
                <button
                  type="button"
                  onClick={() => set({ idle: showIdle ? null : "1", page: null })}
                  className="mt-1 flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className={cn("size-3.5 transition-transform", showIdle && "rotate-90")} />
                  {idle.length} site{idle.length === 1 ? "" : "s"} without offers
                </button>
                {showIdle &&
                  idle.map((s) => (
                    <SiteRow
                      key={s.site.id}
                      active={site?.id === s.site.id}
                      onClick={() => pickSite(s.site.id)}
                      domain={s.site.domain}
                      sub="No offers yet"
                      action={0}
                      muted
                    />
                  ))}
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ================= Offers for the selection ================= */}
      <section className="flex min-w-0 flex-col gap-4">
        {/* Site picker (mobile) */}
        <div className="lg:hidden">
          <SearchableSelect
            value={site ? site.id : "all"}
            onChange={pickSite}
            placeholder="Find a site…"
            options={[
              { value: "all", label: `All sites · ${totalAction} need you` },
              ...stats.map((s) => ({ value: s.site.id, label: `${s.site.domain}${s.action ? ` · ${s.action} need you` : ""}` })),
            ]}
          />
        </div>

        {/* Selected site header */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {site ? (
            <>
              <SiteLabel domain={site.domain} size={22} className="text-lg font-medium" />
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                DR <span className="font-medium text-foreground tabular-nums">{site.dr}</span>
                <DrChange value={site.drChange30d} />
              </span>
              {site.status === "paused" && (
                <Badge variant="outline" className="rounded-full font-normal text-muted-foreground">
                  Paused
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {selectedStats?.total ?? 0} offers · {selectedStats?.open ?? 0} open
              </span>
              <Link href={`/sites/${site.domain}`} className="ml-auto text-xs font-medium underline-offset-2 hover:underline">
                Site details →
              </Link>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 text-lg font-medium">
                <Layers className="size-5 text-muted-foreground" /> All sites
              </span>
              <span className="text-sm text-muted-foreground">
                {totalOffers} offers across {rail.sitesWithOffers} sites
              </span>
            </>
          )}
        </div>

        {/* Stage cards double as a filter */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {STAGES.map((st) => {
            const on = stage === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => set({ stage: on ? null : st })}
                aria-pressed={on}
                className={cn(
                  "flex flex-col gap-0.5 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-foreground/30",
                  on && "border-foreground/60 ring-1 ring-foreground/20",
                )}
              >
                <span className="text-[13px] text-muted-foreground">{stageMeta[st].label}</span>
                <span className={cn("text-2xl font-[450] tracking-tight tabular-nums", stageCount(st) > 0 && stageTone[st])}>
                  {stageCount(st)}
                </span>
                <span className="truncate text-xs text-muted-foreground">{stageMeta[st].hint}</span>
              </button>
            );
          })}
          <Card className="col-span-2 rounded-2xl xl:col-span-1">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-[13px] text-muted-foreground">In progress</span>
              <span className="text-2xl font-[450] tracking-tight tabular-nums">{formatUsd(inFlight)}</span>
              <span className="truncate text-xs text-muted-foreground">Paid deals not yet completed</span>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 md:flex-row md:items-center">
          <SearchInput value={query} placeholder="Search counterparty or offer ID…" />
          <SimpleSelect
            className="md:w-40"
            value={direction}
            onChange={(v) => set({ direction: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All directions" },
              { value: "received", label: "Received" },
              { value: "sent", label: "Sent" },
            ]}
          />
          <SimpleSelect
            className="md:w-40"
            value={market}
            onChange={(v) => set({ market: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All markets" },
              { value: "paid", label: "Paid" },
              { value: "exchange", label: "Exchange" },
              { value: "abc", label: "ABC" },
            ]}
          />
        </div>

        {/* Table */}
        <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Counterparty</TableHead>
                <TableHead className="hidden md:table-cell">Direction</TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortHeader label="Amount" sortKey="amount" sort={sort} onSort={onSort} />
                </TableHead>
                <TableHead>Where it stands</TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortHeader label="Created" sortKey="created" sort={sort} onSort={onSort} />
                </TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((o) => {
                const st = offerStage(o);
                const cta = actionLabel(o);
                return (
                  <TableRow
                    key={o.id}
                    className={cn("cursor-pointer", st === "closed" && "opacity-60")}
                    onClick={() => router.push(`/offers/${o.ref}`)}
                  >
                    <TableCell className={cn("pl-4", st === "action" && "shadow-[inset_3px_0_0_var(--color-amber-500)]")}>
                      <div className="flex flex-col gap-1">
                        <SiteLabel domain={o.counterpartyDomain} className="font-medium" />
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MarketBadge market={o.type} icon className="h-5 px-1.5 text-[11px]" />
                          <span className="truncate">{o.categories.map((c) => categoryLabels[c]).join(", ")}</span>
                          <span className="font-mono">{o.ref}</span>
                        </span>
                        {/* In "All sites", say which of your sites the offer is for */}
                        {!site && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            for <SiteLabel domain={o.yourDomain} size={12} className="max-w-48" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span
                        className={cn(
                          "flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                          o.direction === "received" ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" : "bg-muted/50",
                        )}
                      >
                        {o.direction === "received" ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                        {o.direction === "received" ? "Received" : "Sent"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">{o.amount ? formatUsd(o.amount) : "Free"}</TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col gap-1">
                        <OfferStatusBadge status={o.status} live={isLiveLink(o)} className="w-fit" />
                        <span className={cn("max-w-64 text-xs", st === "action" ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {nextStep(o)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <AddedCell date={o.createdAt} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {cta ? (
                        <Link
                          href={`/offers/${o.ref}`}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
                        >
                          {cta}
                        </Link>
                      ) : (
                        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0 whitespace-normal">
                    <EmptyState
                      compact
                      icon={scopedCount ? SearchX : Handshake}
                      title={scopedCount ? "No offers match" : `No offers on ${site?.domain ?? "your sites"} yet`}
                      description={scopedCount ? "Try another stage, direction or market." : "Offers sent or received for this site will appear here."}
                      action={
                        scopedCount ? (
                          <Button variant="outline" size="sm" className="rounded-full" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        ) : undefined
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
      </section>
    </div>
  );
}

function SiteRow({
  active,
  onClick,
  domain,
  icon,
  label,
  sub,
  action,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  domain?: string;
  icon?: React.ReactNode;
  label?: string;
  sub: string;
  action: number;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors",
        active ? "bg-foreground text-background" : "hover:bg-foreground/[0.05]",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        {domain ? (
          <SiteLabel domain={domain} size={14} className={cn("text-xs font-medium", muted && !active && "text-muted-foreground")} />
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium">
            {icon}
            {label}
          </span>
        )}
        <span className={cn("pl-5 text-[10.5px]", active ? "text-background/70" : "text-muted-foreground")}>{sub}</span>
      </span>
      {action > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums",
            active ? "bg-amber-400 text-black" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          )}
          title={`${action} need your action`}
        >
          {action}
        </span>
      )}
    </button>
  );
}
