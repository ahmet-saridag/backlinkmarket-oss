import { compact } from "@/lib/heat";

// Self-reported traffic buckets — there's no free, reliable third-party API for a third party's
// traffic, so the seller picks a range and we store its conservative floor. Shared by the client
// wizard and the server validation/actions, so it carries no server-only imports.
export const trafficRanges = [
  { value: "500", label: "Under 1,000 / month", short: "<1k" },
  { value: "1000", label: "1,000–5,000 / month", short: "1k–5k" },
  { value: "5000", label: "5,000–25,000 / month", short: "5k–25k" },
  { value: "25000", label: "25,000–100,000 / month", short: "25k–100k" },
  { value: "100000", label: "100,000–500,000 / month", short: "100k–500k" },
  { value: "500000", label: "500,000+ / month", short: "500k+" },
] as const;
export type TrafficRangeValue = (typeof trafficRanges)[number]["value"];
export const isTrafficRangeValue = (v: string): v is TrafficRangeValue => trafficRanges.some((r) => r.value === v);

/**
 * A stored traffic number that exactly matches one of our bucket floors came from this
 * self-reported picker — show the range the seller actually chose, not the bare floor number.
 * Anything else falls back to a formatted count.
 */
export const trafficRangeLabelFor = (traffic: number): string | null =>
  trafficRanges.find((r) => r.value === String(traffic))?.label ?? null;

/** Compact traffic for tables and cards: the chosen range ("<1k", "5k–25k"), never the bucket's floor number. */
export const displayTraffic = (traffic: number): string =>
  trafficRanges.find((r) => r.value === String(traffic))?.short ?? compact(traffic);
