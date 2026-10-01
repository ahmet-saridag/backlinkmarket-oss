"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Always-visible action bar for offer wizards: where you are, what's missing, and the next step by name. */
export function WizardActionBar({
  steps,
  step,
  hint,
  ok,
  onGo,
  finish,
}: {
  steps: string[];
  step: number;
  hint: string;
  ok: boolean;
  onGo: (step: number) => void;
  /** The last step's button (e.g. "Send offer") */
  finish: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:pl-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium tabular-nums">
          {step + 1}/{steps.length}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{steps[step]}</span>
          <span className={cn("truncate text-xs", ok ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400")}>{hint}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {step > 0 && (
          <Button variant="ghost" className="rounded-full" onClick={() => onGo(step - 1)} aria-label={`Back to ${steps[step - 1]}`}>
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">{steps[step - 1]}</span>
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1 rounded-full sm:flex-none" size="lg" disabled={!ok} onClick={() => onGo(step + 1)}>
            Next: {steps[step + 1]} <ArrowRight className="size-4" />
          </Button>
        ) : (
          finish
        )}
      </div>
    </div>
  );
}
