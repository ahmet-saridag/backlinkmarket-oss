import { UserRound } from "lucide-react";
import { SiteFavicon } from "@/components/shared/SiteFavicon";
import { cn } from "@/lib/utils";

export interface CycleSeat {
  domain?: string;
  dr?: number;
  you?: boolean;
  /** Caption under an empty seat */
  hint?: string;
}

const LETTERS = ["A", "B", "C"] as const;
// Seat centres in the 400×330 drawing: A on top, B bottom-right, C bottom-left (links run clockwise).
const POS = [
  { x: 200, y: 62 },
  { x: 330, y: 262 },
  { x: 70, y: 262 },
];
const CENTROID = { x: 200, y: 195 };
const R = 44;

/** A curved arrow from one seat to the next, bowed away from the middle of the triangle. */
function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const start = { x: a.x + ux * R, y: a.y + uy * R };
  const end = { x: b.x - ux * (R + 8), y: b.y - uy * (R + 8) };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let nx = -uy;
  let ny = ux;
  if ((mid.x - CENTROID.x) * nx + (mid.y - CENTROID.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const c = { x: mid.x + nx * 26, y: mid.y + ny * 26 };
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M ${r(start.x)} ${r(start.y)} Q ${r(c.x)} ${r(c.y)} ${r(end.x)} ${r(end.y)}`;
}

/**
 * The three seats as the viewer sees them: their own site on top (A), then the seats in link order.
 * Seat i links to seat i+1 and the last links back to the first; empty seats show as open.
 */
export function roomSeats(seats: { seat: number; domain: string; dr: number; mine: boolean }[]): CycleSeat[] {
  const bySeat = new Map(seats.map((s) => [s.seat, s]));
  const mine = seats.find((s) => s.mine)?.seat ?? 1;
  return [0, 1, 2].map((i) => {
    const s = bySeat.get(((mine - 1 + i) % 3) + 1);
    return s ? { domain: s.domain, dr: s.dr, you: s.mine } : { hint: "Open seat" };
  });
}

/** The ABC loop: three seats, links flowing A → B → C → A. */
export function AbcCycle({ seats, center, className }: { seats: CycleSeat[]; center?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-[400/330] w-full max-w-[440px]", className)}>
      <svg viewBox="0 0 400 330" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <marker id="abc-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-sky-500" />
          </marker>
          <marker id="abc-arrow-idle" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground/40" />
          </marker>
        </defs>
        {POS.map((p, i) => {
          const next = (i + 1) % 3;
          const live = !!seats[i]?.domain && !!seats[next]?.domain;
          return (
            <path
              key={i}
              d={arc(p, POS[next])}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={live ? "10 4" : "3 6"}
              markerEnd={live ? "url(#abc-arrow)" : "url(#abc-arrow-idle)"}
              className={cn(live ? "animate-flow stroke-sky-500 motion-reduce:animate-none" : "stroke-muted-foreground/40")}
            />
          );
        })}
      </svg>

      {center && (
        <div className="absolute top-[59%] left-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:flex">
          {center}
        </div>
      )}

      {seats.map((s, i) => (
        <div
          key={i}
          className="absolute flex w-28 -translate-x-1/2 -translate-y-8 flex-col sm:w-32 sm:-translate-y-[44px] items-center gap-1.5 text-center"
          style={{ left: `${(POS[i].x / 400) * 100}%`, top: `${(POS[i].y / 330) * 100}%` }}
        >
          <span
            className={cn(
              "relative grid size-16 place-items-center rounded-full border-2 bg-card shadow-sm sm:size-[88px]",
              s.you
                ? "border-sky-500 ring-4 ring-sky-500/15"
                : s.domain
                  ? "border-border"
                  : "animate-pulse border-dashed border-muted-foreground/40 bg-muted/40 motion-reduce:animate-none",
            )}
          >
            {s.domain ? <SiteFavicon domain={s.domain} size={28} /> : <UserRound className="size-6 text-muted-foreground/60" />}
            <span
              className={cn(
                "absolute -top-1 -left-1 grid size-7 place-items-center rounded-full border-2 border-card font-mono text-xs font-semibold",
                s.you ? "bg-sky-500 text-white" : s.domain ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {LETTERS[i]}
            </span>
            {s.dr !== undefined && (
              <span className="absolute -right-1 -bottom-1 rounded-full border-2 border-card bg-muted px-1.5 font-mono text-[10px] font-medium tabular-nums">
                DR {s.dr}
              </span>
            )}
          </span>
          <span className={cn("max-w-full truncate rounded-md bg-card px-1.5 text-[13px]", s.domain ? "font-medium" : "text-muted-foreground")}>
            {s.domain ?? s.hint}
          </span>
          {s.you && <span className="-mt-1 text-[10px] font-medium tracking-wide text-sky-600 uppercase dark:text-sky-400">You</span>}
        </div>
      ))}
    </div>
  );
}

/** A tiny loop for lists: three dots on a triangle, filled seats solid, yours in sky. */
export function MiniLoop({ taken, youAt, size = 40, className }: { taken: number; youAt?: number; size?: number; className?: string }) {
  const pts = [
    [20, 6],
    [34, 31],
    [6, 31],
  ];
  return (
    <svg viewBox="0 0 40 38" width={size} height={size * 0.95} className={cn("shrink-0", className)} aria-label={`${taken} of 3 seats taken`}>
      <path
        d="M20 6 L34 31 L6 31 Z"
        fill="none"
        strokeWidth={1.5}
        strokeDasharray={taken === 3 ? undefined : "2 3"}
        className={taken === 3 ? "stroke-sky-500" : "stroke-muted-foreground/40"}
      />
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={5}
          strokeWidth={1.5}
          className={cn(
            i === youAt ? "fill-sky-500 stroke-sky-500" : i < taken ? "fill-foreground stroke-foreground" : "fill-card stroke-muted-foreground/50",
          )}
        />
      ))}
    </svg>
  );
}
