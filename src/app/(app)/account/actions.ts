"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mirrorGoogleAvatar } from "@/lib/avatar";
import { fieldErrors, notificationSchema, payoutSchema, profileSchema, type ActionResult } from "@/lib/validation/account";

// Every action re-checks the session and re-validates its input: the forms' checks are for feedback only.

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const NOT_SIGNED_IN: ActionResult = { ok: false, error: "You're signed out. Sign in again and retry." };
const GENERIC: ActionResult = { ok: false, error: "Something went wrong. Please try again." };

function done(): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const { displayName, username, country, language, timezone } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: displayName, username, country, language, timezone })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { username: "That username is taken." } };
    return GENERIC;
  }
  return done();
}

export async function saveNotificationPrefs(input: unknown): Promise<ActionResult> {
  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notification settings." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const { error } = await supabase.from("profiles").update({ notification_prefs: parsed.data }).eq("id", userId);
  return error ? GENERIC : done();
}

/** Paid Market seller payout: wire, PayPal, USDT or bank transfer — nothing else is accepted. */
export async function savePayoutAccount(input: unknown): Promise<ActionResult> {
  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const { method, address } = parsed.data;
  const accountHolder = "accountHolder" in parsed.data ? parsed.data.accountHolder : null;
  const network = "network" in parsed.data ? (parsed.data.network || null) : null;
  const row = { user_id: userId, method, account_holder: accountHolder, network, address };
  const { data: existing } = await supabase.from("payout_accounts").select("user_id").eq("user_id", userId).maybeSingle();
  const { error } = existing
    ? await supabase.from("payout_accounts").update(row).eq("user_id", userId)
    : await supabase.from("payout_accounts").insert(row);
  return error ? GENERIC : done();
}

export async function removePayoutAccount(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { error } = await supabase.from("payout_accounts").delete().eq("user_id", userId);
  return error ? GENERIC : done();
}

/** Opening the bell counts as reading everything in it — remembered on the account, so a refresh doesn't bring the badge back. */
export async function markNotificationsRead(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { error } = await supabase.from("profiles").update({ notifications_read_at: new Date().toISOString() }).eq("id", userId);
  return error ? GENERIC : { ok: true };
}

/** Stores the signed-in user's Google photo with us so other users (e.g. buyers in the market) can see it. */
export async function mirrorAvatar(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  if (!profile?.avatar_url) return { ok: true };
  const url = await mirrorGoogleAvatar(supabase, userId, profile.avatar_url);
  if (!url) return GENERIC;
  revalidatePath("/", "layout");
  return { ok: true };
}
