import { cn } from "@/lib/utils";

/**
 * Backlink Market mark: three sites linked in a loop — one link market, three ways to trade.
 * The sky node is "your site". Drawn on a 32-unit grid so it stays crisp from 16px up.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-[28%] bg-foreground text-background", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <path d="M16 8.5 24.2 22.6H7.8Z" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" />
        <circle cx={24.2} cy={22.6} r={3.6} fill="currentColor" />
        <circle cx={7.8} cy={22.6} r={3.6} fill="currentColor" />
        {/* your site: sky, with a gap ring so it reads as its own node */}
        <circle cx={16} cy={8.5} r={4.6} className="fill-foreground" />
        <circle cx={16} cy={8.5} r={3.6} className="fill-sky-400" />
      </svg>
    </span>
  );
}

/** Mark + wordmark. */
export function Logo({ size = 28, className, showName = true }: { size?: number; className?: string; showName?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <LogoMark size={size} />
      {showName && (
        <span className="truncate text-[13px] tracking-tight">
          <span className="font-semibold">Backlink</span> <span className="font-normal text-muted-foreground">Market</span>
        </span>
      )}
    </span>
  );
}
