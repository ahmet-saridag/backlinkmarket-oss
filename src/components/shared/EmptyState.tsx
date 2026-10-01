import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shown when a list has nothing to render. `bordered` draws its own dashed box (standalone use);
 * leave it off inside a card or table cell that already has a frame.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bordered = false,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 text-center",
        compact ? "py-8" : "py-14",
        bordered && "rounded-2xl border border-dashed bg-card",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-full border bg-muted/50">
        <Icon className="size-4.5 text-muted-foreground" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        {description && <span className="text-[13px] text-muted-foreground">{description}</span>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
