"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { AbcList } from "@/lib/list-types";
import Link from "next/link";
import { ArrowRight, Compass, Home, SearchX, TriangleAlert, UsersRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Callout } from "@/components/shared/Callout";
import { EmptyState } from "@/components/shared/EmptyState";
import { SiteFavicon, SiteLabel } from "@/components/shared/SiteFavicon";
import { DateTime } from "@/components/shared/DateTime";
import { AddedCell } from "@/components/shared/AddedCell";
import { SearchInput } from "@/components/shared/SearchInput";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { MiniLoop } from "@/components/markets/AbcCycle";
import { bandLabel } from "@/components/markets/AbcPool";
import { cn } from "@/lib/utils";
import type { AbcRoomView, AcceptedRange } from "@/lib/abc-data";

type Tab = "mine" | "joined" | "explore";
/** "DR 40–60 · traffic 5000+" for the range a pool host accepts; empty when anyone can join. */
const acceptedText = (t: AcceptedRange | null | undefined) => {
  if (!t) return "";
  const parts: string[] = [];
  if ((t.drMin ?? 0) > 0 || (t.drMax ?? 100) < 100) parts.push(`DR ${t.drMin ?? 0}–${t.drMax ?? 100}`);
  if ((t.trafficMin ?? 0) > 0 || (t.trafficMax ?? null) !== null) parts.push(`traffic ${t.trafficMin ?? 0}${t.trafficMax != null ? `–${t.trafficMax}` : "+"}`);
  return parts.join(" · ");
};
const roomNo = (r: AbcRoomView) => `#${r.ref}`;
const youAt = (r: AbcRoomView) => Math.max(0, r.seats.findIndex((s) => s.mine));

function StatusPill({ room }: { room: AbcRoomView }) {
  const [label, tone] =
    room.status === "open"
      ? [`Filling · ${room.seatCount}/3`, "bg-sky-500/15 text-sky-700 dark:text-sky-400"]
      : room.closed
        ? ["Closed · a member missed the deadline", "bg-red-500/15 text-red-700 dark:text-red-400"]
      : room.linkDue
        ? ["Your link is due · 72h", "bg-amber-500/15 text-amber-700 dark:text-amber-400"]
        : room.complete
          ? ["Complete · links live", "bg-green-500/15 text-green-700 dark:text-green-400"]
        : ["Locked · links in progress", "bg-muted text-muted-foreground"];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", tone)}>{label}</span>;
}

function Members({ room, skipMine }: { room: AbcRoomView; skipMine?: boolean }) {
  const others = room.seats.filter((s) => !(skipMine && s.mine));
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex -space-x-1.5">
        {others.map((m) => (
          <span key={m.seat} className="grid size-6 place-items-center rounded-full border-2 border-card bg-muted">
            <SiteFavicon domain={m.domain} size={14} />
          </span>
        ))}
        {Array.from({ length: 3 - room.seatCount }, (_, i) => (
          <span key={i} className="size-6 rounded-full border-2 border-dashed border-muted-foreground/40 bg-card" />
        ))}
      </span>
      <span className="truncate text-xs text-muted-foreground">{others.length ? others.map((m) => m.domain).join(", ") : "Nobody yet"}</span>
    </span>
  );
}

/**
 * The ABC Pool board: the pools your sites host (one each), the pools you joined, and open pools
 * from others to explore and join.
 */
export function AbcPoolBoard(initial: AbcList) {
  const { data: live } = useLiveList("abc", initial);
  const { tab, rooms, hosted, counts, due, total, page, q, pageSize, mySites, roomFits, status } = live;
  const { set, pending } = useListParams();

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "mine", label: "My pools", icon: Home },
    { id: "joined", label: "Joined", icon: UsersRound },
    { id: "explore", label: "Explore", icon: Compass },
  ];

  const hostedBySite = new Map(hosted.map((r) => [r.hostSiteId, r]));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = rooms;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full bg-muted p-1 md:w-fit" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => set({ tab: id === "mine" ? null : id, q: null })}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors sm:px-4 md:flex-none",
              tab === id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="hidden size-3.5 sm:block" />
            {label}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{counts[id]}</span>
          </button>
        ))}
      </div>

      {due.length > 0 && (
        <Link href={`/markets/abc/${due[0].ref}`} className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 font-medium">
            {due.length} locked pool{due.length > 1 ? "s" : ""} need{due.length === 1 ? "s" : ""} your link
          </span>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Open</span>
        </Link>
      )}

      {tab !== "mine" && (
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-2.5 md:flex-row md:items-center">
          <SearchInput value={q} placeholder="Search sites or niches in pools…" />
          {tab === "explore" && (
            <SimpleSelect
              className="md:w-44"
              value={status}
              onChange={(v) => set({ status: v === "all" ? null : v })}
              options={[
                { value: "all", label: "Open and locked" },
                { value: "open", label: "Open — can join" },
                { value: "locked", label: "Locked — running" },
              ]}
            />
          )}
        </div>
      )}

      {tab === "mine" &&
        (mySites.length === 0 ? (
          <Callout variant="warning" title="List a site in ABC Pool first">
            Open one of your sites to ABC Pool in{" "}
            <Link href="/sites" className="underline">
              My Sites
            </Link>{" "}
            and it can host its own pool.
          </Callout>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {mySites.map((s) => {
              const room = hostedBySite.get(s.id);
              return room ? (
                <Link
                  key={s.id}
                  href={`/markets/abc/${room.ref}`}
                  className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20", room.linkDue && "border-amber-500/40")}
                >
                  <div className="flex items-start gap-3">
                    <MiniLoop taken={room.seatCount} youAt={youAt(room)} size={44} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <SiteLabel domain={s.domain} className="font-medium" />
                      <span className="text-[11px] text-muted-foreground">
                        {bandLabel(room)} · {roomNo(room)} · opened <DateTime iso={room.createdAt} time={false} />
                      </span>
                      <span className="flex">
                        <StatusPill room={room} />
                      </span>
                    </div>
                  </div>
                  <Members room={room} skipMine />
                  <span className="flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                    {room.status === "open" ? `${3 - room.seatCount} seat${3 - room.seatCount > 1 ? "s" : ""} open` : room.closed ? "Pool closed — nothing more is due" : room.linkDue ? "Place your link to keep the loop going" : "Loop is running"}
                    <ArrowRight className="size-3.5 shrink-0" />
                  </span>
                </Link>
              ) : (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-dashed bg-card p-4">
                  <MiniLoop taken={0} size={44} />
                  <div className="flex min-w-0 flex-col">
                    <SiteLabel domain={s.domain} className="font-medium" />
                    <span className="text-[11px] text-muted-foreground">Its pool is being set up — refresh in a moment.</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab !== "mine" &&
        (total === 0 && rows.length === 0 ? (
          <EmptyState
            bordered
            icon={SearchX}
            title={tab === "joined" ? "You haven't joined any pools" : "No open pools"}
            description={tab === "joined" ? "Pools you take a seat in show up here." : "Pools other people open show up here so you can join them."}
          />
        ) : (
          <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Pool</TableHead>
                  <TableHead>{tab === "joined" ? "Opened by" : "Who's in"}</TableHead>
                  <TableHead className="hidden lg:table-cell">Band</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Added</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={cn(r.linkDue && "bg-amber-500/5")}>
                    <TableCell className="pl-4">
                      <span className="flex items-center gap-2.5">
                        <MiniLoop taken={r.seatCount} youAt={r.mine ? youAt(r) : undefined} size={30} />
                        <span className="font-mono text-xs text-muted-foreground">{roomNo(r)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-64">
                      {tab === "joined" && r.hostDomain ? <SiteLabel domain={r.hostDomain} className="text-[13px] font-medium" /> : <Members room={r} />}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      <div className="flex flex-col">
                        <span>{bandLabel(r)}</span>
                        {acceptedText(r.host?.terms) && <span>accepts {acceptedText(r.host?.terms)}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill room={r} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <AddedCell date={r.createdAt} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {tab === "explore" && r.status === "open" && mySites.length > 0 && roomFits[r.id] === false ? (
                        // The host accepts a DR / traffic range, like an Exchange listing
                        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none rounded-full opacity-50")}>Out of range</span>
                      ) : (
                        <Link href={`/markets/abc/${r.ref}`} className={cn(buttonVariants({ variant: r.linkDue || (tab === "explore" && r.status === "open") ? "default" : "outline", size: "sm" }), "rounded-full")}>
                          {tab === "explore" && r.status === "open" ? "Join" : r.linkDue ? "Place link" : "View"}
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination total={total} page={page} pageCount={pageCount} pageSize={pageSize} onPageChange={(n) => set({ page: n > 1 ? n : null })} onPageSizeChange={(n) => set({ pageSize: n === 25 ? null : n, page: null })} />
          </div>
        ))}
    </div>
  );
}
