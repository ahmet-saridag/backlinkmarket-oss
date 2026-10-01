"use server";

import { revalidatePath } from "next/cache";
import {
  checkSitemap,
  domainExists,
  DrUnavailableError,
  fetchDomainMetrics,
  isValidDomainFormat,
  normalizeDomain,
  verificationToken,
  verifyFileRecord,
} from "@/lib/site-verification";
import { createClient } from "@/lib/supabase/server";
import { createSiteSchema, type CreateSiteInput } from "@/lib/validation/site";
import type { ActionResult, FieldErrors } from "@/lib/validation/account";
import { fieldErrors } from "@/lib/validation/account";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

/** Domain format + real DNS existence + a real Domain Rating read from Ahrefs — the "url" step gate. */
export async function checkDomain(rawUrl: string) {
  const domain = normalizeDomain(rawUrl);
  if (!isValidDomainFormat(domain)) return { passed: false as const, domain, reason: "That doesn't look like a valid domain." };
  if (!(await domainExists(domain))) return { passed: false as const, domain, reason: "This domain doesn't resolve — check the spelling." };

  try {
    const metrics = await fetchDomainMetrics(domain);
    return { passed: true as const, domain, metrics, metricsFromApi: true, drNote: null };
  } catch (e) {
    // A subdomain (kalamis.vercel.app, blog.example.com) has no DR of its own — Ahrefs would hand back its parent's
    if (e instanceof DrUnavailableError) {
      return { passed: true as const, domain, metrics: { dr: 0, spamScore: 0 }, metricsFromApi: false, drNote: `${domain} is a subdomain of ${e.root}. Ahrefs only rates whole domains, so it would show ${e.root}'s rating, not this site's — DR stays 0 here.` };
    }
    // Ahrefs down or rate-limited: don't block adding the site, just disable Paid Market until it refreshes.
    return { passed: true as const, domain, metrics: { dr: 0, spamScore: 0 }, metricsFromApi: false, drNote: null };
  }
}

/** The exact token this signed-in user must publish for this domain, as a file. */
export async function getVerificationToken(domain: string): Promise<string | null> {
  const { userId } = await currentUserId();
  if (!userId) return null;
  return verificationToken(userId, normalizeDomain(domain));
}

/** Live HTTP fetch of the verification file, checked against the token above. */
export async function verifyOwnership(domain: string): Promise<{ verified: boolean }> {
  const { userId } = await currentUserId();
  if (!userId) return { verified: false };
  const d = normalizeDomain(domain);
  const token = verificationToken(userId, d);
  return { verified: await verifyFileRecord(d, token) };
}

/** Live fetch of /sitemap.xml (or /sitemap_index.xml) and the page URLs inside it. */
export async function checkSitemapForDomain(domain: string) {
  return checkSitemap(normalizeDomain(domain));
}

const NOT_SIGNED_IN: ActionResult = { ok: false, error: "You're signed out. Sign in again and retry." };
const GENERIC: ActionResult = { ok: false, error: "Something went wrong. Please try again." };

/**
 * Final submit. Re-checks ownership live (never trusts a client-side "verified" flag) and
 * re-fetches DR from Ahrefs server-side (never trusts client-supplied metrics) so the
 * Paid Market eligibility gate can't be spoofed. Traffic stays self-reported — there's no free,
 * reliable third-party traffic API, so the seller states a range and we store its conservative floor.
 */
export async function createSite(input: unknown): Promise<ActionResult & { siteId?: string }> {
  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.markets.includes("exchange") && !parsed.data.exchangeTerms?.wantedAnchor?.trim()) return { ok: false, fieldErrors: { wantedAnchor: "Set the anchor text you want to receive in swaps." }, error: "Set the anchor text you want to receive in swaps." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const data: CreateSiteInput = parsed.data;
  const domain = normalizeDomain(data.domain);

  const token = verificationToken(userId, domain);
  if (!(await verifyFileRecord(domain, token))) {
    return { ok: false, error: "Ownership isn't verified anymore — the verification file wasn't found. Verify again before adding." };
  }

  let dr = 0;
  let spamScore = 0;
  try {
    const metrics = await fetchDomainMetrics(domain);
    dr = metrics.dr;
    spamScore = metrics.spamScore;
  } catch {
    // Metrics provider down: site is added with DR 0, Paid Market stays unavailable until a later refresh.
  }

  if (data.markets.includes("paid") && dr < 20) {
    return { ok: false, error: `Paid Market requires DR 20+ — this site is at ${dr}. Remove Paid Market or try again once DR improves.` };
  }

  const sitemap = await checkSitemap(domain);

  // Selling on Paid Market means buyers pay you directly, so there must be a payout account.
  if (data.markets.includes("paid")) {
    const { data: existing } = await supabase.from("payout_accounts").select("user_id").eq("user_id", userId).maybeSingle();
    if (!existing) {
      if (!data.payout) return { ok: false, error: "Add a payout account to sell on Paid Market — buyers pay you directly." };
      const { method, address } = data.payout;
      const accountHolder = "accountHolder" in data.payout ? data.payout.accountHolder : null;
      const network = "network" in data.payout ? data.payout.network || null : null;
      const { error: payoutError } = await supabase
        .from("payout_accounts")
        .insert({ user_id: userId, method, account_holder: accountHolder, network, address });
      if (payoutError) return { ok: false, error: "Couldn't save your payout account. Check the details and try again." };
    }
  }

  const traffic = Number(data.trafficRange);

  const { data: row, error } = await supabase
    .from("sites")
    .insert({
      user_id: userId,
      domain,
      dr,
      traffic,
      spam_score: spamScore,
      dr_change_30d: 0,
      markets: data.markets,
      status: "active",
      niches: data.niches,
      language: data.language,
      country: data.country,
      sitemap_page_count: sitemap.total,
      verified_at: new Date().toISOString().slice(0, 10),
      categories: data.categories,
      exchange_terms: data.exchangeTerms,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already added this domain." };
    return GENERIC;
  }

  revalidatePath("/sites");
  revalidatePath("/", "layout");
  return { ok: true, siteId: row.id };
}

export type { FieldErrors };
