"use client";

import { BadgeCheck, ChevronDown, X, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SellerAvatar } from "@/components/markets/SellerAvatar";
import { cn } from "@/lib/utils";
import type { MarketSite } from "@/lib/types";

/* Building blocks shared by the Paid and Exchange market views. */

export const DR_PRESETS: [number, number, string][] = [
  [0, 30, "0–30"],
  [30, 50, "30–50"],
  [50, 70, "50–70"],
  [70, 100, "70+"],
];
export const TRAFFIC_PRESETS: [number, string][] = [
  [0, "Any"],
  [1000, "1k+"],
  [10000, "10k+"],
  [100000, "100k+"],
  [1000000, "1M+"],
];
export const daysAgo = (d?: string) => (d ? Math.round((Date.now() - Date.parse(d)) / 86_400_000) : 999);


export function SellerCell({ site }: { site: MarketSite }) {
  const s = site.seller;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SellerAvatar seller={s} size={28} />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 truncate text-[13px] font-medium">
          {s?.name ?? "Seller"}
          {s?.verified && <BadgeCheck className="size-3.5 shrink-0 text-sky-500" aria-label="Verified seller" />}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {site.completedDeals + (site.seller?.failedDeals ?? 0) === 0 ? (
            "New seller"
          ) : (
            <>
              <span className={cn(site.reputation >= 90 ? "text-green-700 dark:text-green-400" : site.reputation < 85 && "text-amber-700 dark:text-amber-400")}>
                {site.reputation}% done
              </span>
              · {site.completedDeals} deal{site.completedDeals === 1 ? "" : "s"}
            </>
          )}
          {site.fastResponder && <Zap className="size-3 text-amber-500" aria-label="Fast responder" />}
        </span>
      </div>
    </div>
  );
}

export function FilterChip({
  label,
  value,
  onClear,
  children,
}: {
  label: string;
  value?: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-full border text-xs transition-colors",
        value ? "border-foreground/40 bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      <Popover>
        <PopoverTrigger className={cn("flex items-center gap-1 py-1.5 pl-3 outline-none", value ? "pr-1" : "pr-2.5")}>
          {label}
          {value ? <span className="font-medium">· {value}</span> : <ChevronDown className="size-3.5" />}
        </PopoverTrigger>
        <PopoverContent>{children}</PopoverContent>
      </Popover>
      {value && (
        <button type="button" onClick={onClear} aria-label={`Clear ${label} filter`} className="grid size-6 place-items-center rounded-full hover:bg-muted">
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

export function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{title}</span>
      {children}
    </div>
  );
}

export function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function NumberBox({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <Input
      type="number"
      min={0}
      max={100}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
      className="h-8 text-center tabular-nums"
    />
  );
}

export function ViewBtn({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-full", on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}

/* ---------- the shared list look (same as Backlinks): two-line cells, plain tinted numbers, one filter bar ---------- */

export const drTone = (dr: number) => (dr >= 60 ? "text-green-700 dark:text-green-400" : dr >= 30 ? "text-foreground" : "text-muted-foreground");

export const drPresetValue = (min: number, max: number) => (min === 0 && max === 100 ? "all" : `${min}-${max}`);
export const drPresetOptions = [{ value: "all", label: "Any DR" }, ...DR_PRESETS.map(([lo, hi, label]) => ({ value: `${lo}-${hi}`, label: `DR ${label}` }))];
export const trafficPresetOptions = TRAFFIC_PRESETS.map(([v, label]) => ({ value: String(v), label: v === 0 ? "Any traffic" : `${label} / mo` }));

/** DR as a plain number, tinted by strength. */
export function DrValue({ dr }: { dr: number }) {
  return <span className={cn("text-base font-medium tabular-nums", drTone(dr))}>{dr}</span>;
}
