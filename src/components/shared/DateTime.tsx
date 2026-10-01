"use client";

import { useEffect, useState } from "react";
import { useTimeZone } from "@/components/account/user-context";
import { formatDateTime, formatFriendly } from "@/lib/datetime";

/**
 * A moment in the viewer's own time zone. By default it reads like a person: "12 minutes ago", "in 3 hours",
 * "Sep 30 Monday 18:44". `part` (or `exact`) asks for the exact numbers instead, e.g. "2026-09-30 20:49 UTC+3";
 * hovering always shows those.
 */
export function DateTime({ iso, time = true, zone = true, part, exact, className }: { iso: string; time?: boolean; zone?: boolean; part?: "date" | "time"; exact?: boolean; className?: string }) {
  const tz = useTimeZone();
  const [now, setNow] = useState(() => Date.now());
  const friendly = !exact && !part && time;
  // Keep "x minutes ago" true while the page stays open
  useEffect(() => {
    if (!friendly) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [friendly]);
  if (!iso) return null;
  const full = formatDateTime(iso, tz, { time: true, zone: true });
  return (
    <time dateTime={iso} suppressHydrationWarning className={className} title={friendly ? full : (tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone)}>
      {friendly ? formatFriendly(iso, tz, now) : formatDateTime(iso, tz, { time, zone, part })}
    </time>
  );
}
