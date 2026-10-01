import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UserSite } from "@/lib/types";

type Row = {
  id: string;
  domain: string;
  dr: number;
  traffic: number;
  spam_score: number;
  dr_change_30d: number;
  dr_checked_at: string | null;
  markets: string[];
  status: string;
  niches: string[];
  language: string;
  country: string;
  sitemap_page_count: number;
  verified_at: string | null;
  created_at: string;
  categories: unknown;
  exchange_terms: unknown;
};

const toUserSite = (row: Row): UserSite => ({
  id: row.id,
  domain: row.domain,
  dr: row.dr,
  traffic: row.traffic,
  spamScore: row.spam_score,
  drChange30d: row.dr_change_30d,
  drCheckedAt: row.dr_checked_at ?? undefined,
  markets: row.markets as UserSite["markets"],
  status: row.status as UserSite["status"],
  niches: row.niches,
  language: row.language,
  country: row.country,
  sitemapPageCount: row.sitemap_page_count,
  verifiedAt: row.verified_at ?? "",
  createdAt: row.created_at,
  categories: (row.categories ?? []) as UserSite["categories"],
  exchangeTerms: row.exchange_terms as UserSite["exchangeTerms"],
});

/** One of the signed-in user's sites, from Supabase. */
export async function getRealUserSite(domain: string): Promise<UserSite | undefined> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return undefined;
  const { data: row } = await supabase.from("sites").select("*").eq("domain", domain).eq("user_id", auth.user.id).is("archived_at", null).maybeSingle();
  return row ? toUserSite(row) : undefined;
}

/** All of the signed-in user's real (non-archived) sites. */
export async function listRealUserSites(): Promise<UserSite[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: rows } = await supabase
    .from("sites")
    .select("*")
    .eq("user_id", auth.user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return (rows ?? []).map(toUserSite);
}

/** The domain behind an old uuid link (own site), so it can redirect to the domain-based address. */
export async function domainOfUserSite(id: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("domain").eq("id", id).maybeSingle();
  return data?.domain ?? undefined;
}
