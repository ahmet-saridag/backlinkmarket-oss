import "server-only";
import { lookup } from "dns/promises";
import { isIP } from "net";
import type { LinkStatus } from "@/lib/types";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 3;

/** True for loopback, private, link-local and other non-public addresses. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/** The delivered URL is typed in by the seller, so it must never be a way to reach our own network. */
async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs can be checked.");
  if (url.username || url.password) throw new Error("URLs with credentials aren't allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("That port isn't allowed.");
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new Error("That address can't be checked.");
  return url;
}

/** Why a page couldn't be read: the page is gone (404/410 — the link is gone with it), or we couldn't reach it (not their fault). */
class PageError extends Error {
  constructor(message: string, readonly kind: "gone" | "unreachable") {
    super(message);
  }
}

type Fetched = { html: string; finalUrl: string };

/**
 * One fetch per page per batch, however many offers sit on it, and never more than two at a time on one site —
 * so a site with thousands of our links isn't hammered, and a page with several links is opened once.
 */
export function createPageCache(perHost = 2) {
  const pages = new Map<string, Promise<Fetched>>();
  const running = new Map<string, number>();
  const waiting = new Map<string, (() => void)[]>();
  const hostOfUrl = (u: string) => {
    try {
      return new URL(u).hostname;
    } catch {
      return u;
    }
  };
  const acquire = async (h: string) => {
    while ((running.get(h) ?? 0) >= perHost) await new Promise<void>((r) => waiting.set(h, [...(waiting.get(h) ?? []), r]));
    running.set(h, (running.get(h) ?? 0) + 1);
  };
  const release = (h: string) => {
    running.set(h, (running.get(h) ?? 1) - 1);
    waiting.get(h)?.shift()?.();
  };
  return {
    get(url: string): Promise<Fetched> {
      let p = pages.get(url);
      if (!p) {
        const h = hostOfUrl(url);
        p = (async () => {
          await acquire(h);
          try {
            return await fetchPage(url);
          } finally {
            release(h);
          }
        })();
        pages.set(url, p);
      }
      return p;
    },
  };
}
export type PageCache = ReturnType<typeof createPageCache>;

async function fetchPage(raw: string): Promise<Fetched> {
  let url = await assertPublicHttpUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "BacklinkMarketBot/1.0 (+link verification)", Accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicHttpUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new PageError(`The page answered ${res.status}.`, res.status === 404 || res.status === 410 ? "gone" : "unreachable");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("The page had no content.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { html: Buffer.concat(chunks).toString("utf8"), finalUrl: url.toString() };
  }
  throw new Error("Too many redirects.");
}

/** An HTML attribute value — double-quoted, single-quoted or unquoted. */
function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

const host = (u: string) => u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export type LinkFailure = "missing" | "nofollow" | "anchor_changed" | "unreachable";

export interface LinkCheckResult {
  ok: boolean;
  reason?: string;
  /** What kind of failure, when there is one — "unreachable" is never the seller's fault */
  kind?: LinkFailure;
  status: LinkStatus;
}

type Wanted = { targetUrl: string; anchor: string };

/** Looks in an already-fetched page for the link to the buyer's site: there, dofollow, and with the agreed anchor. */
function evaluate(page: { html: string; finalUrl: string }, input: Wanted, now: string): LinkCheckResult {
  const fail = (reason: string, partial: Partial<LinkStatus> = {}): LinkCheckResult => ({
    ok: false,
    reason,
    kind: "missing",
    status: { live: false, dofollow: false, anchorMatches: false, lastScan: now, ...partial },
  });

  const targetHost = host(input.targetUrl);
  const anchors = [...page.html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi)];
  const links = anchors
    .map((m) => {
      const attrs = m[1];
      const href = attr(attrs, "href");
      if (!href) return null;
      let absolute: string;
      try {
        absolute = new URL(href, page.finalUrl).toString();
      } catch {
        return null;
      }
      const rel = (attr(attrs, "rel") ?? "").toLowerCase();
      return { absolute, rel, label: text(m[2]) };
    })
    .filter((l): l is { absolute: string; rel: string; label: string } => !!l && host(l.absolute) === targetHost);

  if (!links.length) {
    return fail(`We loaded ${page.finalUrl} (${anchors.length} link${anchors.length === 1 ? "" : "s"} on the page) and none of them goes to ${targetHost}.`);
  }

  const wanted = input.anchor.trim().toLowerCase();
  const best = links.find((l) => l.label === wanted) ?? links.find((l) => l.label.includes(wanted)) ?? links[0];
  const dofollow = !/\b(nofollow|sponsored|ugc)\b/.test(best.rel);
  const anchorMatches = best.label === wanted || best.label.includes(wanted);
  const status: LinkStatus = { live: true, dofollow, anchorMatches, lastScan: now };

  if (!dofollow) return { ok: false, reason: `The link to ${targetHost} is on the page, but it is marked rel="${best.rel.trim()}" — it has to be a normal dofollow link.`, kind: "nofollow", status };
  if (!anchorMatches) return { ok: false, reason: `The link to ${targetHost} is on the page, but its text is “${best.label || "(empty)"}” instead of “${input.anchor}”.`, kind: "anchor_changed", status };
  return { ok: true, status };
}

/** Fetches a page and checks one link on it. */
export async function checkLink(input: { deliveredUrl: string } & Wanted): Promise<LinkCheckResult> {
  const [result] = await checkLinksOnPage(input.deliveredUrl, [input]);
  return result;
}

/** Fetches a page once and checks every link that should be on it (the ordered link plus any extra dofollow links). */
export async function checkLinksOnPage(pageUrl: string, wanted: Wanted[], cache?: PageCache): Promise<LinkCheckResult[]> {
  const now = new Date().toISOString();
  let page: Fetched;
  try {
    page = await (cache ? cache.get(pageUrl) : fetchPage(pageUrl));
  } catch (e) {
    const gone = e instanceof PageError && e.kind === "gone";
    const reason = `We couldn't open ${pageUrl}: ${e instanceof Error ? e.message : "it didn't load."}`;
    return wanted.map(() => ({ ok: false, reason, kind: gone ? "missing" : "unreachable", status: { live: false, dofollow: false, anchorMatches: false, lastScan: now } }));
  }
  return wanted.map((w) => evaluate(page, w, now));
}
