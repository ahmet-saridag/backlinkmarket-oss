"use client";

import { DateTime } from "@/components/shared/DateTime";
import { timeAgo } from "@/lib/dates";

/** When something was created, stacked so a table column stays narrow: the date, then the time in your zone, then how long ago. */
export function AddedCell({ date }: { date: string }) {
  if (!date) return <span className="text-muted-foreground/50">—</span>;
  return (
    <div className="flex flex-col whitespace-nowrap">
      <DateTime iso={date} part="date" className="text-muted-foreground tabular-nums" />
      <DateTime iso={date} part="time" className="text-xs text-muted-foreground tabular-nums" />
      <span className="text-xs text-muted-foreground/70" suppressHydrationWarning>
        {timeAgo(date)}
      </span>
    </div>
  );
}
