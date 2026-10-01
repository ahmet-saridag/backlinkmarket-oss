import { Banknote } from "lucide-react";
import { payoutViaLabel } from "@/lib/validation/account";
import { cn } from "@/lib/utils";
import type { Seller } from "@/lib/types";

/** How the seller wants to be paid — the buyer has to be able to pay that way, so it's shown before anything else. */
export function PaysVia({ seller, className }: { seller?: Seller; className?: string }) {
  if (!seller?.payoutMethod) return <span className="text-xs text-muted-foreground/60">—</span>;
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border border-green-600/30 bg-green-600/10 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-green-800 dark:text-green-300", className)}>
      <Banknote className="size-3.5" />
      {payoutViaLabel(seller.payoutMethod, seller.payoutNetwork)}
    </span>
  );
}
