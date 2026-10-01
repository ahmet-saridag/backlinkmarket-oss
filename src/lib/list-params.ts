/** Reading list state (search, filters, sort, page) out of a page's `searchParams` — the URL is the single source of truth. */
export type SP = Record<string, string | string[] | undefined>;

export const PAGE_SIZES = [10, 25, 50] as const;

const one = (sp: SP, key: string) => {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
};

export const str = (sp: SP, key: string, max = 100) => (one(sp, key) ?? "").trim().slice(0, max);

export function int(sp: SP, key: string, def: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(one(sp, key));
  return Number.isFinite(n) && one(sp, key) !== undefined && one(sp, key) !== "" ? Math.max(min, Math.min(max, Math.trunc(n))) : def;
}

export function oneOf<T extends string>(sp: SP, key: string, allowed: readonly T[], def: T): T {
  const v = one(sp, key);
  return allowed.includes(v as T) ? (v as T) : def;
}

/** Comma-separated multi-select values, limited to a known set. */
export function csv<T extends string = string>(sp: SP, key: string, allowed?: readonly T[]): T[] {
  const values = (one(sp, key) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return (allowed ? values.filter((v): v is T => allowed.includes(v as T)) : (values as T[])).slice(0, 30);
}

export function pageParams(sp: SP, defaultSize = 25) {
  const size = int(sp, "pageSize", defaultSize);
  return { page: int(sp, "page", 1, 1, 100_000), pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : defaultSize };
}

/** Escapes `%`, `_` and PostgREST filter separators so user text is matched literally inside ilike patterns. */
export const likeTerm = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ");

/** Clamps a requested page to the real page count. */
export const clampPage = (page: number, total: number, pageSize: number) => Math.min(page, Math.max(1, Math.ceil(total / pageSize)));

export type SortDir = "asc" | "desc";

/** `?sort=key&dir=asc|desc`, limited to known keys. */
export function sortParams<K extends string>(sp: SP, keys: readonly K[], defKey: K, defDir: SortDir): { key: K; dir: SortDir } {
  const key = oneOf(sp, "sort", keys, defKey);
  const dir = oneOf(sp, "dir", ["asc", "desc"] as const, key === defKey ? defDir : defDir);
  return { key, dir };
}

/** What clicking a column header does: same column flips the direction, a new one starts at its natural direction. */
export function nextSort<K extends string>(current: { key: K; dir: SortDir }, key: K, firstDir: SortDir = "desc"): { sort: K; dir: SortDir } {
  return { sort: key, dir: current.key === key ? (current.dir === "asc" ? "desc" : "asc") : firstDir };
}
