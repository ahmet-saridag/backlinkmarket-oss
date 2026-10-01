import "server-only";
import { currentStanding, penaltyRules } from "@/lib/standing-rules";
import { createClient } from "@/lib/supabase/server";
import type { AccountStanding, ViolationType } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The account's real standing: the penalties recorded this calendar month, and whether it is suspended. */
export async function getStanding(supabase: Supabase, userId: string): Promise<AccountStanding> {
  const base = currentStanding();
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("violations").select("id, type, points, created_at, offer_id, offers(ref)").eq("user_id", userId).gte("created_at", `${base.windowStartedAt}T00:00:00Z`).order("created_at", { ascending: false }),
    supabase.from("profiles").select("suspended_until").eq("id", userId).maybeSingle(),
  ]);
  const violations = (rows ?? []).map((r) => ({
    id: r.id as string,
    type: r.type as ViolationType,
    offerId: ((r.offers as unknown as { ref: string } | null)?.ref ?? (r.offer_id as string).slice(0, 10)) as string,
    date: (r.created_at as string).slice(0, 10),
    points: r.points as number,
  }));
  const until = profile?.suspended_until as string | null | undefined;
  return {
    ...base,
    penaltyPoints: violations.reduce((a, v) => a + v.points, 0),
    violations,
    suspendedUntil: until && until >= new Date().toISOString().slice(0, 10) ? until : null,
  };
}

/** Suspended accounts can't start new offers or join pools; deals already running carry on. */
export async function suspensionMessage(supabase: Supabase, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("suspended_until").eq("id", userId).maybeSingle();
  const until = data?.suspended_until as string | null | undefined;
  return until && until >= new Date().toISOString().slice(0, 10) ? `Your account is suspended until ${until} (${penaltyRules.suspensionThreshold} penalty points). You can't start new offers or join pools until then.` : null;
}
