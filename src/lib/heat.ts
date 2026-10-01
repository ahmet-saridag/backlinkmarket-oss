import type { CSSProperties } from "react";

/** Red → amber → green as a value climbs; `t` is 0..1. Sets the hue that `heatText`/`heatBar` read. */
export const heat = (t: number) => ({ "--h": Math.round(25 + Math.max(0, Math.min(1, t)) * 120) }) as CSSProperties;
export const heatText = "text-[oklch(0.55_0.16_var(--h))] dark:text-[oklch(0.8_0.15_var(--h))]";
export const heatBar = "bg-[oklch(0.7_0.16_var(--h))]";
export const drHeat = (dr: number) => heat((dr - 10) / 85);
/** Log scale so 5k and 5M both read. */
export const trafficT = (n: number) => (Math.log10(Math.max(n, 1)) - 3) / 3.3;
export const trafficHeat = (n: number) => heat(trafficT(n));

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;

/**
 * Bar width as a whole percentage (min 4% so tiny values still show). Rounded so server and
 * browser render the same string — their float math can differ in the last digits.
 */
export const barWidth = (fill: number) => `${Math.round(Math.min(100, Math.max(4, fill)))}%`;
