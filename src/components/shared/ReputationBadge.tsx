import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Reputation = completion rate (0–100). */
export function ReputationBadge({ value, className }: { value: number; className?: string }) {
  const tone =
    value >= 90
      ? "border-green-600/30 bg-green-600/15 text-green-700 dark:text-green-400"
      : value >= 80
        ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400";
  return (
    <Badge variant="outline" className={cn("rounded-full font-normal", tone, className)} title="Completion rate">
      <ShieldCheck className="size-3" />
      {value}% completion
    </Badge>
  );
}
