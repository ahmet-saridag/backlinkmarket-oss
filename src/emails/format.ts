/** Everything an email says about time, money and names, written for the person reading it. */

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...o }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(new Date(iso));
  }
};

/** "Sat, Oct 4 · 21:40" */
export function when(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  const date = fmt(iso, tz, { weekday: "short", month: "short", day: "numeric" });
  const time = fmt(iso, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${date} · ${time}`;
}

/** "Oct 12" */
export const day = (iso: string | null | undefined, tz: string) => (iso ? fmt(iso, tz, { month: "short", day: "numeric" }) : "");

/** "Oct 12, 2026" */
export const dayLong = (iso: string | null | undefined, tz: string) => (iso ? fmt(iso, tz, { month: "short", day: "numeric", year: "numeric" }) : "");

/** A bare date such as "2026-10-12" (no time zone to convert) */
export const dateOnly = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

/** "Oct 12" for a bare date */
export const dateShort = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "");

export const firstName = (full: string | null | undefined) => {
  const n = (full ?? "").trim().split(/\s+/)[0];
  return n || undefined;
};

/** Without the scheme, for showing addresses in a small box. */
export const clean = (url: string | null | undefined) => (url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") || url : undefined);

/** First day of next month, for "points reset". */
export function nextMonthStart(tz: string): string {
  const now = new Date();
  return fmt(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(), tz, { month: "short", day: "numeric" });
}
