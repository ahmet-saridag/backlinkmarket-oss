"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type ActionResult } from "@/lib/validation/account";
import { updateSiteSchema } from "@/lib/validation/site";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const NOT_SIGNED_IN: ActionResult = { ok: false, error: "You're signed out. Sign in again and retry." };
const GENERIC: ActionResult = { ok: false, error: "Something went wrong. Please try again." };

function done(): ActionResult {
  revalidatePath("/sites");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Markets, categories, niche and exchange terms — the domain and its verified metrics never change here. */
export async function updateSite(id: string, input: unknown): Promise<ActionResult> {
  const parsed = updateSiteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.markets.includes("exchange") && !parsed.data.exchangeTerms?.wantedAnchor?.trim()) return { ok: false, fieldErrors: { wantedAnchor: "Set the anchor text you want to receive in swaps." }, error: "Set the anchor text you want to receive in swaps." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const { markets, niches, language, country, categories, exchangeTerms } = parsed.data;
  if (markets.includes("paid")) {
    const { data: payout } = await supabase.from("payout_accounts").select("user_id").eq("user_id", userId).maybeSingle();
    if (!payout) return { ok: false, error: "Add a payout account in Account first — buyers pay you directly on Paid Market." };
  }
  const { error } = await supabase
    .from("sites")
    .update({ markets, niches, language, country, categories, exchange_terms: exchangeTerms })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return GENERIC;
  revalidatePath(`/sites/${id}`);
  return done();
}

export async function setSiteStatus(id: string, status: "active" | "paused"): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { error } = await supabase.from("sites").update({ status }).eq("id", id).eq("user_id", userId);
  if (error) return GENERIC;
  revalidatePath(`/sites/${id}`);
  return done();
}

/** Soft delete: the row stays (past deals, payments and history keep referring to it), just hidden. */
export async function archiveSite(id: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { error } = await supabase.from("sites").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  if (error) return GENERIC;
  return done();
}
