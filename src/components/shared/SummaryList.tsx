import { cn } from "@/lib/utils";

export function SummaryList({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y rounded-xl border text-sm", className)}>
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`} className="flex items-start justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground">{it.label}</dt>
          <dd className="min-w-0 text-right break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
