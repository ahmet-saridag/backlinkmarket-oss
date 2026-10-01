import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Read-only value box (e.g. metrics fetched from an API, seller requirements). */
export function ReadOnlyValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-8 items-center rounded-lg border border-dashed bg-muted/40 px-2.5 text-sm tabular-nums", className)}>
      {children}
    </div>
  );
}
