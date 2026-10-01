import { Clock, Link2, Repeat, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const bandLabels = ["DR 0–19", "DR 20–39", "DR 40–59", "DR 60+"];
export const bandLabel = (r: { niche: string; drBand: number }) => `${r.niche} · ${bandLabels[r.drBand]}`;

/** Soft "water" backdrop for pool cards. */
export function PoolSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl border bg-card", className)}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklch, var(--color-sky-500) 13%, transparent), transparent 70%)",
      }}
    >
      {children}
      <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 w-full" aria-hidden>
        <path d="M0 14 C 50 4, 100 24, 150 14 S 250 4, 300 14 S 380 22, 400 12 L 400 24 L 0 24 Z" className="fill-sky-500/10" />
        <path d="M0 18 C 60 10, 110 26, 170 18 S 270 10, 330 18 S 390 24, 400 18 L 400 24 L 0 24 Z" className="fill-sky-500/10" />
      </svg>
    </div>
  );
}

/** ● ● ○ — seats taken in a room. */
export function SeatDots({ filled, className }: { filled: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-label={`${filled} of 3 seats taken`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("size-2.5 rounded-full", i < filled ? "bg-sky-500" : "border border-dashed border-muted-foreground/50")} />
      ))}
    </span>
  );
}

/** How the pool works, in four chips. */
export function AbcRules() {
  const rules = [
    { icon: Repeat, text: "A → B → C → A: nobody links back directly" },
    { icon: Users, text: "3 seats per room — host your own or join others" },
    { icon: Link2, text: "Link Insertion only, no money involved" },
    { icon: Clock, text: "72h to place your link once the room locks" },
  ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {rules.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5 text-sky-600 dark:text-sky-400" />
          {text}
        </li>
      ))}
    </ul>
  );
}
