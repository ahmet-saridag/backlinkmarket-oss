"use client";

import Link from "next/link";
import { ScrollText, SearchX } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTime } from "@/components/shared/DateTime";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { describeLog, logKinds } from "@/lib/log-text";
import { useLiveList } from "@/lib/query/use-live-list";
import type { LogsList } from "@/lib/list-types";
import { cn } from "@/lib/utils";

/** Everything that happened to your account, newest first: offer steps, link checks, penalties and payments. */
export function LogsView(initial: LogsList) {
  const { data: live } = useLiveList("logs", initial);
  const { rows, total, page, pageSize, filters, hasAny } = live;
  const { set, clear, pending } = useListParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (!hasAny) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader title="Logs" description="Every step of your offers, every link check, every penalty and payment." />
        <EmptyState bordered icon={ScrollText} title="Nothing logged yet" description="Once you send or receive an offer, each step is recorded here." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader title="Logs" description="Every step of your offers, every link check, every penalty and payment." />

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 md:flex-row md:items-center">
        <SearchInput value={filters.q} placeholder="Search a domain, offer ID or event…" />
        <SimpleSelect
          className="md:w-44"
          value={filters.kind}
          onChange={(v) => set({ kind: v === "all" ? null : v, page: null })}
          options={[
            { value: "all", label: "All records" },
            { value: "offer", label: "Offer steps" },
            { value: "link", label: "Link checks" },
            { value: "penalty", label: "Penalties" },
            { value: "payment", label: "Payments" },
          ]}
        />
      </div>

      <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">When</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>What happened</TableHead>
              <TableHead className="hidden md:table-cell">With</TableHead>
              <TableHead className="hidden pr-4 sm:table-cell">Offer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    compact
                    icon={SearchX}
                    title="No records match"
                    description="Try another word or record type."
                    action={
                      <button className="text-sm underline underline-offset-2" onClick={() => clear(["q", "kind", "page"])}>
                        Clear filters
                      </button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => {
                const { title, detail } = describeLog(r);
                const other = r.sellerYou ? r.buyerDomain : r.sellerDomain;
                return (
                  <TableRow key={`${r.at}-${r.offerRef}-${r.event}-${i}`}>
                    <TableCell className="pl-4 align-top whitespace-nowrap text-muted-foreground">
                      <DateTime iso={r.at} />
                    </TableCell>
                    <TableCell className="align-top">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", logKinds[r.kind].tone)}>{logKinds[r.kind].label}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{title}</span>
                        {detail && <span className="max-w-xl text-xs text-muted-foreground">{detail}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden align-top md:table-cell">
                      <div className="flex flex-col gap-1">
                        {other && <SiteLabel domain={other} size={16} className="text-sm" />}
                        {r.market && <MarketBadge market={r.market} className="w-fit" />}
                      </div>
                    </TableCell>
                    <TableCell className="hidden pr-4 align-top sm:table-cell">
                      {r.offerRef && (
                        <Link href={`/offers/${r.offerRef}`} className="font-mono text-xs underline-offset-2 hover:underline">
                          #{r.offerRef}
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
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
    </div>
  );
}
