import { finalDayWarning } from "@/lib/anomaly-warning";
import { createClient } from "@/lib/supabase/server";

// A tiny "has anything of mine changed?" answer, so an open page can refresh itself when the system decides something
// (a deadline, a removed link, a penalty) without every tab re-loading everything every minute.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ v: "" }, { status: 401 });
  const [{ data: offer }, { data: anomalies }, { data: profile }] = await Promise.all([
    supabase.from("offers").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("offers").select("anomaly").eq("status", "ANOMALY_CHECK"),
    supabase.from("profiles").select("suspended_until").eq("id", auth.user.id).maybeSingle(),
  ]);
  // A time-based warning (the last day of a 7-day window) changes what the page shows without any row changing
  const finalDay = (anomalies ?? []).filter((a) => finalDayWarning(a.anomaly as { windowEndsAt: string } | null)).length;
  return Response.json({ v: `${offer?.updated_at ?? ""}|${profile?.suspended_until ?? ""}|${finalDay}` }, { headers: { "Cache-Control": "no-store" } });
}
