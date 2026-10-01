import { ArrowLeftRight, Circle, DollarSign, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { marketLabels } from "@/lib/labels";
import type { MarketType } from "@/lib/types";

const styles: Record<MarketType, string> = {
  paid: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  exchange: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400",
  abc: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

/** Paid = money ($), Exchange = 1:1 swap (⇄), ABC = 3-way pool (○) */
export const marketIcons: Record<MarketType, LucideIcon> = { paid: DollarSign, exchange: ArrowLeftRight, abc: Circle };

export function MarketBadge({ market, icon = false, className }: { market: MarketType; icon?: boolean; className?: string }) {
  const Icon = marketIcons[market];
  return (
    <Badge variant="outline" className={cn("rounded-full font-normal", icon && "gap-1", styles[market], className)}>
      {icon && <Icon className="size-3" aria-hidden />}
      {marketLabels[market]}
    </Badge>
  );
}
