/**
 * A link that went missing has a 7-day window (`windowEndsAt` is that last day, UTC). During that last day there are
 * 24 hours or less left: this says when the warning starts, or null while there's still more time.
 */
export function finalDayWarning(anomaly: { windowEndsAt: string } | undefined | null, now: number = Date.now()): { at: string } | null {
  if (!anomaly?.windowEndsAt) return null;
  const start = Date.parse(`${anomaly.windowEndsAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start) || now < start) return null;
  // Past the end of that day the offer is decided by the scan, not warned about
  if (now >= start + 86_400_000) return null;
  return { at: new Date(start).toISOString() };
}
