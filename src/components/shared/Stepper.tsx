import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                active && "border-foreground/40 bg-card text-foreground",
                done && "text-foreground",
                !active && !done && "border-transparent text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full font-mono text-[10px]",
                  done ? "bg-score-hot text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {done ? <Check className="size-2.5" /> : i + 1}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
