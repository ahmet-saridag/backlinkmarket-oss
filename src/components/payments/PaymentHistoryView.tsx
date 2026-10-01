"use client";

import { useLiveList } from "@/lib/query/use-live-list";
import type { PaymentsList } from "@/lib/list-types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Download, Receipt, SearchX, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { SortHeader, TablePagination } from "@/components/shared/TablePagination";
import { useListParams } from "@/components/shared/use-list-params";
import { countExport } from "@/app/(app)/payment-history/actions";
import { nextSort } from "@/lib/list-params";
import { formatUsd } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { payoutMethodLabels, payoutMethods } from "@/lib/validation/account";
import type { Payment } from "@/lib/types";

const statusStyles: Record<Payment["status"], { label: string; className: string }> = {
  completed: { label: "Completed", className: "border-green-600/30 bg-green-600/15 text-green-700 dark:text-green-400" },
  pending: { label: "Payment sent", className: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  refunded: { label: "Refunded", className: "border-border bg-muted text-muted-foreground" },
};

/* ---------- date range ---------- */

type Preset = "all" | "this_month" | "last_month" | "last_3_months" | "this_year" | "last_year" | "custom";

const presetOptions: { value: Preset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Inclusive YYYY-MM-DD bounds for a preset, relative to today. */
function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_month":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last_month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "last_3_months":
      return { from: iso(new Date(y, m - 2, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "this_year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last_year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return { from: "", to: "" };
  }
}

/* ---------- export dialog: the period/type/status filters live here ---------- */

function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<"all" | Payment["type"]>("all");
  const [status, setStatus] = useState<"all" | Payment["status"]>("all");
  const [provider, setProvider] = useState<"all" | Payment["provider"]>("all");
  const [counted, setCounted] = useState<{ key: string; n: number } | null>(null);

  // The server counts what the export would contain
  const key = JSON.stringify({ from, to, type, status, provider });
  useEffect(() => {
    if (!open) return;
    let stale = false;
    countExport({ from, to, type, status, provider }).then((n) => !stale && setCounted({ key, n }));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);
  const count = counted?.key === key ? counted.n : null;
  const query = new URLSearchParams(Object.entries({ from, to, type, status, provider }).filter(([, v]) => v && v !== "all")).toString();

  const applyPreset = (v: Preset) => {
    setPreset(v);
    if (v !== "custom") {
      const r = presetRange(v);
      setFrom(r.from);
      setTo(r.to);
    }
  };
  const reset = () => {
    applyPreset("all");
    setType("all");
    setStatus("all");
    setProvider("all");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<Button className="rounded-full" />}>
        <Download className="size-4" /> Export
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export payments</DialogTitle>
          <DialogDescription>Choose what goes into the CSV. Amounts are signed: received +, paid −.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="ph-period" className="text-xs text-muted-foreground">
              Period
            </Label>
            <SimpleSelect id="ph-period" value={preset} onChange={(v) => applyPreset(v as Preset)} options={presetOptions} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ph-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="ph-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ph-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="ph-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ph-type" className="text-xs text-muted-foreground">
              Type
            </Label>
            <SimpleSelect
              id="ph-type"
              value={type}
              onChange={(v) => setType(v as typeof type)}
              options={[
                { value: "all", label: "All types" },
                { value: "received", label: "Received" },
                { value: "sent", label: "Paid" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ph-status" className="text-xs text-muted-foreground">
              Status
            </Label>
            <SimpleSelect
              id="ph-status"
              value={status}
              onChange={(v) => setStatus(v as typeof status)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "completed", label: "Completed" },
                { value: "pending", label: "Payment sent" },
                { value: "refunded", label: "Refunded" },
              ]}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="ph-provider" className="text-xs text-muted-foreground">
              Provider
            </Label>
            <SimpleSelect
              id="ph-provider"
              value={provider}
              onChange={(v) => setProvider(v as typeof provider)}
              options={[{ value: "all", label: "All providers" }, ...payoutMethods.map((m) => ({ value: m, label: payoutMethodLabels[m] }))]}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {count === null ? "Counting…" : count === 0 ? "No payments match these filters." : `${count} payment${count === 1 ? "" : "s"} will be exported.`}
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="rounded-full" />}>Cancel</DialogClose>
          <a
            href={`/payment-history/export${query ? `?${query}` : ""}`}
            download
            aria-disabled={!count}
            className={cn(buttonVariants(), "rounded-full", !count && "pointer-events-none opacity-50")}
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            <Download className="size-4" /> Download CSV ({count ?? "…"})
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- view ---------- */

type SortKey = "date" | "amount";

export function PaymentHistoryView(initial: PaymentsList) {
  const { data: live } = useLiveList("payments", initial);
  const { payments, total, page, pageSize, sort, totals } = live;
  const router = useRouter();
  const { set, pending } = useListParams();
  const pageRows = payments;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const stats = [
    { label: "Received (completed)", value: totals.received },
    { label: "Paid out", value: totals.paidOut },
    // Marked sent but not yet confirmed by delivery, split by direction
    { label: "Coming to you (pending)", value: totals.pendingIn },
    { label: "Paid by you (pending)", value: totals.pendingOut },
  ];

  const toggleSort = (key: SortKey) => set(nextSort(sort, key, "desc"));

  if (totals.count === 0) {
    return (
      <EmptyState
        bordered
        icon={Receipt}
        title="No payments yet"
        description="Paid Market deals show up here — what you pay directly to sellers and what you earn."
        action={
          <Link href="/markets/paid" className={cn(buttonVariants(), "rounded-full")}>
            <Store className="size-4" /> Browse Paid Market
          </Link>
        }
      />
    );
  }

  return (
    <>
      {/* ---- totals + export (filters open in the export dialog) ---- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <span className="text-xs text-muted-foreground">All-time totals</span>
          <ExportDialog />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="rounded-2xl">
              <CardContent className="flex flex-col gap-1">
                <span className="text-[13px] text-muted-foreground">{s.label}</span>
                <span className="text-2xl font-[450] tracking-tight tabular-nums">{formatUsd(s.value)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ---- table ---- */}
      <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity", pending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4"><SortHeader label="Date" sortKey="date" sort={sort} onSort={toggleSort} /></TableHead>
              <TableHead className="hidden lg:table-cell">Payment ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden md:table-cell">Provider</TableHead>
              <TableHead className="text-right"><SortHeader label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} align="right" /></TableHead>
              <TableHead className="hidden sm:table-cell">Offer</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((p) => {
              // The whole row opens the offer; archived offers have no page, so their rows stay inert.
              const href = p.offerRef ? `/offers/${p.offerRef}` : null;
              return (
              <TableRow
                key={p.id}
                onClick={href ? () => router.push(href) : undefined}
                onKeyDown={
                  href
                    ? (e) => {
                        if (e.key === "Enter") router.push(href);
                      }
                    : undefined
                }
                tabIndex={href ? 0 : undefined}
                role={href ? "link" : undefined}
                aria-label={href ? `Open offer ${p.offerRef}` : undefined}
                className={cn(href && "group/row cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none")}
              >
                <TableCell className="pl-4 text-muted-foreground tabular-nums">{p.date}</TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{p.id}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    {p.type === "received" ? (
                      <ArrowDownLeft className="size-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    )}
                    {p.type === "received" ? "Payment received" : "Payment made"}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{p.description}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{payoutMethodLabels[p.provider]}</TableCell>
                <TableCell className={cn("text-right tabular-nums", p.type === "received" && "text-green-700 dark:text-green-400")}>
                  {p.type === "received" ? "+" : "−"}
                  {formatUsd(p.amount)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {href ? (
                    <span className="font-mono text-xs underline-offset-2 group-hover/row:underline">{p.offerRef}</span>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground" title="Archived offer">
                      {p.offerRef ?? "archived"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="pr-4">
                  <Badge variant="outline" className={cn("rounded-full font-normal", statusStyles[p.status].className)}>
                    {statusStyles[p.status].label}
                  </Badge>
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
                    title="No payments"
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
    </>
  );
}
