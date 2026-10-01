import "server-only";
import { clampPage, oneOf, type SP } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";
import { payoutMethods } from "@/lib/validation/account";
import type { Payment } from "@/lib/types";

export interface PaymentFilters {
  from: string;
  to: string;
  type: "all" | Payment["type"];
  status: "all" | Payment["status"];
  provider: "all" | Payment["provider"];
}

const isoDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/** From a page's search params or a plain object (the export dialog / server action). */
export function parsePaymentFilters(sp: SP): PaymentFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  return {
    from: isoDate(one("from")),
    to: isoDate(one("to")),
    type: oneOf(sp, "type", ["all", "received", "sent"] as const, "all"),
    status: oneOf(sp, "status", ["all", "completed", "pending", "refunded"] as const, "all"),
    provider: oneOf(sp, "provider", ["all", ...payoutMethods] as const, "all") as PaymentFilters["provider"],
  };
}

const COLUMNS = "id, date, type, amount, description, offer_id, status, provider";

type Row = { id: string; date: string; type: string; amount: number | string; description: string; offer_id: string; status: string; provider: string };
const toPayment = (r: Row): Payment => ({
  id: r.id,
  date: r.date,
  type: r.type as Payment["type"],
  amount: Number(r.amount),
  description: r.description,
  offerId: r.offer_id,
  status: r.status as Payment["status"],
  provider: r.provider as Payment["provider"],
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Adds each payment's offer reference (the offer's page address). */
async function withRefs(supabase: Supabase, payments: Payment[]): Promise<Payment[]> {
  const ids = [...new Set(payments.map((p) => p.offerId))];
  if (!ids.length) return payments;
  const { data } = await supabase.from("offers").select("id, ref").in("id", ids);
  const refs = new Map((data ?? []).map((o) => [o.id as string, o.ref as string]));
  return payments.map((p) => ({ ...p, offerRef: refs.get(p.offerId) }));
}

async function base() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  return { supabase, userId: auth.user?.id ?? "" };
}

/** One sorted page of the signed-in user's payments; the database does the sorting and paging. */
export async function listPayments(sort: { key: "date" | "amount"; dir: "asc" | "desc" }, wantedPage: number, pageSize: number) {
  const { supabase, userId } = await base();
  const run = (p: number) =>
    supabase
      .from("payments")
      .select(COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .order(sort.key, { ascending: sort.dir === "asc" })
      .order("id")
      .range((p - 1) * pageSize, p * pageSize - 1);
  const first = await run(wantedPage);
  const total = first.count ?? 0;
  const page = clampPage(wantedPage, total, pageSize);
  const rows = page === wantedPage ? first.data : (await run(page)).data;
  return { payments: await withRefs(supabase, ((rows ?? []) as Row[]).map(toPayment)), total, page };
}

/** All-time totals for the cards, summed in the database query result rather than in the browser. */
export async function paymentTotals() {
  const { supabase, userId } = await base();
  const { data } = await supabase.from("payments").select("type, status, amount").eq("user_id", userId);
  const sum = (f: (p: { type: string; status: string }) => boolean) =>
    (data ?? []).filter(f).reduce((a, p) => a + Number(p.amount), 0);
  return {
    count: data?.length ?? 0,
    received: sum((p) => p.type === "received" && p.status === "completed"),
    paidOut: sum((p) => p.type === "sent" && p.status !== "refunded"),
    pendingIn: sum((p) => p.type === "received" && p.status === "pending"),
    pendingOut: sum((p) => p.type === "sent" && p.status === "pending"),
  };
}

function matching(supabase: Supabase, userId: string, f: PaymentFilters, head: boolean) {
  let qb = supabase.from("payments").select(COLUMNS, { count: "exact", head }).eq("user_id", userId);
  if (f.from) qb = qb.gte("date", f.from);
  if (f.to) qb = qb.lte("date", f.to);
  if (f.type !== "all") qb = qb.eq("type", f.type);
  if (f.status !== "all") qb = qb.eq("status", f.status);
  if (f.provider !== "all") qb = qb.eq("provider", f.provider);
  return qb;
}

export async function countPayments(f: PaymentFilters): Promise<number> {
  const { supabase, userId } = await base();
  const { count } = await matching(supabase, userId, f, true);
  return count ?? 0;
}

/** Everything the export filters select, oldest first. */
export async function exportPayments(f: PaymentFilters): Promise<Payment[]> {
  const { supabase, userId } = await base();
  const { data } = await matching(supabase, userId, f, false).order("date", { ascending: true }).order("id").limit(50_000);
  return withRefs(supabase, ((data ?? []) as Row[]).map(toPayment));
}
