import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConditionCheck } from "@/lib/types";

export function ConditionRow({ check }: { check: ConditionCheck }) {
  const warning = !check.passed && check.severity === "info";
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      {check.passed ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" aria-label="Passed" />
      ) : warning ? (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Warning" />
      ) : (
        <CircleX className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-label="Failed" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <span
          className={cn(
            "text-sm",
            warning ? "text-amber-700 dark:text-amber-400" : !check.passed && "text-red-700 dark:text-red-400",
          )}
        >
          {check.label}
          {warning && <span className="ml-1.5 text-xs text-muted-foreground">(info — doesn&apos;t block)</span>}
        </span>
        {check.detail && <span className="text-xs text-muted-foreground sm:text-right">{check.detail}</span>}
      </div>
    </li>
  );
}

export function ConditionList({ checks, className }: { checks: ConditionCheck[]; className?: string }) {
  return (
    <ul className={cn("divide-y rounded-2xl border bg-card", className)}>
      {checks.map((c) => (
        <ConditionRow key={c.label} check={c} />
      ))}
    </ul>
  );
}

/** Info-only checks are shown but never block. */
export const allPassed = (checks: ConditionCheck[]) => checks.every((c) => c.passed || c.severity === "info");
