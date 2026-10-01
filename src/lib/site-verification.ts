import "server-only";
import { createHmac } from "crypto";
import { lookup, resolve4, resolve6, resolveNs } from "dns/promises";
import { getDomain } from "tldts";
import type { SiteMetrics } from "@/lib/types";

import { verificationFileUrl } from "@/lib/domain";

export { normalizeDomain, isValidDomainFormat, VERIFICATION_FILE_PATH, verificationFileUrl } from "@/lib/domain";

/** Real DNS lookup: the domain has to actually resolve, not just look like one. */
export async function domainExists(domain: string): Promise<boolean> {
  // Ask several ways at once — the resolver library, the operating system, and a public DNS-over-HTTPS service —
  // and stop at the first that sees the domain. Serverless runtimes sometimes can't reach the first two for
  // perfectly good names (e.g. *.vercel.app); waiting for every lookup to time out would make the check crawl.
  const attempts: Promise<boolean>[] = [
    resolve4(domain).then((r) => r.length > 0),
    lookup(domain, { all: true }).then((r) => r.length > 0),
    dohExists(domain, "A"),
    resolve6(domain).then((r) => r.length > 0),
    resolveNs(domain).then((r) => r.length > 0),
    dohExists(domain, "AAAA"),
  ];
  return new Promise<boolean>((resolve) => {
    let pending = attempts.length;
    const finish = (v: boolean) => resolve(v);
    const cap = setTimeout(() => finish(false), 6_000);
    for (const p of attempts) {
      p.then(
        (ok) => {
          if (ok) {
            clearTimeout(cap);
            finish(true);
          } else if (--pending === 0) {
            clearTimeout(cap);
            finish(false);
          }
        },
        () => {
          if (--pending === 0) {
            clearTimeout(cap);
            finish(false);
          }
        },
      );
    }
  });
}

async function dohExists(domain: string, type: "A" | "AAAA"): Promise<boolean> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) return false;
  const body = (await res.json()) as { Status?: number; Answer?: unknown[] };
  return body.Status === 0 && (body.Answer?.length ?? 0) > 0;
}

const FETCH_TIMEOUT_MS = 8_000;

/** Deterministic per-(user, domain) token — nothing to store, nothing that can be replayed for another domain. */
export function verificationToken(userId: string, domain: string): string {
  const secret = process.env.SITE_VERIFICATION_SECRET;
  if (!secret) throw new Error("SITE_VERIFICATION_SECRET is not set");
  return createHmac("sha256", secret).update(`${userId}:${domain}`).digest("hex").slice(0, 24);
}

/** Fetches the well-known file over HTTP and checks the token appears in it (bare, or as key=value). */
export async function verifyFileRecord(domain: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(verificationFileUrl(domain), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) return false;
    const body = await res.text();
    return body.includes(token);
  } catch {
    return false;
  }
}

export { checkSitemap, type SitemapResult } from "@/lib/sitemap";

/* ---------- Ahrefs: free Domain Rating endpoint (0 API units — same key boldpilot uses) ---------- */

const AHREFS_DR_ENDPOINT = "https://api.ahrefs.com/v3/public/domain-rating-free";

interface AhrefsDrResponse {
  domain_rating?: { domain_rating?: number };
}

/**
 * Real Domain Rating from Ahrefs' one free endpoint. No spam score is available on the free
 * tier, so that stays 0 — shown to the seller as "not available", never fabricated.
 *
 * Per https://ahrefs.com/legal/domain-rating-license, every DR shown to a person must carry the
 * "Domain Rating by Ahrefs" attribution, linked to ahrefs.com.
 */
/**
 * Ahrefs rates whole domains. Ask it about `kalamis.vercel.app` (or `blog.example.com`) and it answers with the DR of
 * `vercel.app` (or `example.com`) — a number that says nothing about the site. So only a domain that is its own
 * registrable domain gets a DR; anything else is "not available" instead of borrowing its host's or parent's rating.
 */
export class DrUnavailableError extends Error {
  constructor(
    public readonly root: string,
    public readonly domain: string,
  ) {
    super(`${domain} is a subdomain of ${root}`);
  }
}

export function drScope(domain: string): { rated: true } | { rated: false; root: string } {
  const root = getDomain(domain, { allowPrivateDomains: false });
  return !root || root === domain ? { rated: true } : { rated: false, root };
}

export async function fetchDomainMetrics(domain: string): Promise<Pick<SiteMetrics, "dr" | "spamScore">> {
  const scope = drScope(domain);
  if (!scope.rated) throw new DrUnavailableError(scope.root, domain);
  const apiKey = process.env.AHREFS_API_KEY;
  if (!apiKey) throw new Error("AHREFS_API_KEY is not set");
  const res = await fetch(`${AHREFS_DR_ENDPOINT}?target=${encodeURIComponent(domain)}&output=json`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ahrefs HTTP ${res.status}`);
  const body = (await res.json()) as AhrefsDrResponse;
  const value = body.domain_rating?.domain_rating;
  if (typeof value !== "number" || Number.isNaN(value)) throw new Error("Ahrefs returned no rating for this domain.");
  return { dr: Math.max(0, Math.min(100, Math.round(value))), spamScore: 0 };
}
