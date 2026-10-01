/** "today", "3 days ago", "2 months ago" for a date or timestamp string. */
export function timeAgo(value: string, now = Date.now()): string {
  const t = Date.parse(value.includes("T") || value.includes(" ") ? value.replace(" ", "T") : `${value}T00:00:00`);
  if (Number.isNaN(t)) return "";
  const days = Math.floor((now - t) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
