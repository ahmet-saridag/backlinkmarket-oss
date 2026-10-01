"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/shared/SimpleSelect";

export const PAGE_SIZES = [10, 25, 50];

/** Pages `rows`, clamping the page when filters shrink the list. */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  return { pageCount, current, pageRows: rows.slice((current - 1) * pageSize, current * pageSize) };
}

/** Footer for a data table: rows-per-page, range label and prev/next. Place inside the table's bordered box. */
export function TablePagination({
  total,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <SimpleSelect
          className="h-8 w-[72px]"
          value={String(pageSize)}
          onChange={(v) => {
            onPageSizeChange(Number(v));
            onPageChange(1);
          }}
          options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 tabular-nums">
            Page {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            disabled={page === pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Clickable column header that cycles desc → asc. */
export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: K;
  sort: { key: K; dir: "asc" | "desc" };
  onSort: (key: K) => void;
  align?: "right";
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 hover:text-foreground ${align === "right" ? "flex-row-reverse" : ""}`}
      aria-label={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      <span className={active ? "" : "text-muted-foreground"} aria-hidden>
        {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}
