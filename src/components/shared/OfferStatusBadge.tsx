import { Badge } from "@/components/ui/badge";
import { offerStatusLabels } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { OfferStatus } from "@/lib/types";

const styles: Record<OfferStatus, string> = {
  SENT: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400",
  ACCEPTED: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  PAYMENT_RECEIVED: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  DELIVERED: "border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  ACTIVE_MONITORING: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  ANOMALY_CHECK: "border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  // Two terminal violations must never look alike: solid red (ban) vs. amber outline (no ban)
  VIOLATED_BANNED: "border-red-600 bg-red-600 text-white dark:bg-red-600 dark:text-white",
  VIOLATED_NO_BAN: "border-dashed border-amber-600/50 bg-amber-600/10 text-amber-800 dark:text-amber-300",
  COMPLETED: "border-green-600/30 bg-green-600/15 text-green-700 dark:text-green-400",
  REJECTED: "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-400",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  EXPIRED: "border-border bg-muted text-muted-foreground",
};

/** `live` = a completed deal whose link is still up and monitored: shown as "Completed · Active". */
export function OfferStatusBadge({ status, live, className }: { status: OfferStatus; live?: boolean; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-mono text-[10px] tracking-wide", styles[status], className)}>
      {live && status === "COMPLETED" ? "Completed · Active" : offerStatusLabels[status]}
    </Badge>
  );
}
