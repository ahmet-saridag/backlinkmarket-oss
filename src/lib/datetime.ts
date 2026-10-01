/**
 * Every time on screen is shown in the viewer's own time zone (the one on their account, or their browser's until
 * they pick one), so two people looking at the same offer each see their own clock. Dates are stored as UTC.
 */
export function formatDateTime(iso: string, timeZone?: string, opts: { time?: boolean; zone?: boolean; part?: "date" | "time" } = {}): string {
  const time = opts.time ?? true;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "shortOffset",
    }).formatToParts(t);
  } catch {
    // An unknown zone name: fall back to the browser's
    return formatDateTime(iso, undefined, opts);
  }
  const p = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  const date = `${p("year")}-${p("month")}-${p("day")}`;
  if (!time || opts.part === "date") return date;
  const zone = opts.zone === false ? "" : ` ${p("timeZoneName").replace("GMT", "UTC")}`;
  const clock = `${p("hour")}:${p("minute")}${zone}`;
  return opts.part === "time" ? clock : `${date} ${clock}`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * A moment the way a person would say it: "just now", "12 minutes ago", "in 3 hours" when it is close,
 * otherwise "Sep 30 Monday 18:44" (with the year when it isn't this year's). Always in the viewer's time zone.
 */
export function formatFriendly(iso: string, timeZone?: string, now: number = Date.now()): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const diff = t.getTime() - now;
  const abs = Math.abs(diff);
  if (abs < 45_000) return "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  const sameYear = (d: Date) => {
    try {
      return new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(d);
    } catch {
      return new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
    }
  };
  const fmt = (o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone, ...o }).format(t);
    } catch {
      return new Intl.DateTimeFormat("en-US", o).format(t);
    }
  };
  const day = fmt({ month: "short", day: "numeric" });
  const weekday = fmt({ weekday: "long" });
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: safeZone(timeZone), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t);
  const year = sameYear(t) === sameYear(new Date(now)) ? "" : ` ${sameYear(t)}`;
  return `${day}${year} ${weekday} ${clock}`;
}

function safeZone(tz?: string) {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}
