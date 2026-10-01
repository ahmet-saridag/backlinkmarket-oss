import "server-only";
import { clampPage, likeTerm, oneOf, pageParams, str, type SP } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";
import type { LogKind, LogRow } from "@/lib/log-text";
import type { MarketType } from "@/lib/types";

type Row = {
  at: string;
  kind: string;
  event: string;
  detail: string | null;
  offer_ref: string | null;
  market: string | null;
  buyer_domain: string | null;
  seller_domain: string | null;
  seller_you: boolean | null;
  points: number | null;
  amount: number | string | null;
  total: number | string;
};

const toRow = (r: Row): LogRow => ({
  at: new Date(r.at).toISOString(),
  kind: r.kind as LogKind,
  event: r.event,
  detail: r.detail,
  offerRef: r.offer_ref,
  market: (r.market as MarketType | null) ?? null,
  buyerDomain: r.buyer_domain,
  sellerDomain: r.seller_domain,
  sellerYou: !!r.seller_you,
  points: r.points,
  amount: r.amount === null ? null : Number(r.amount),
});

/** One page of everything that happened to the account — the database filters, orders and pages it. */
export async function queryLogs(sp: SP) {
  const supabase = await createClient();
  const { page, pageSize } = pageParams(sp, 25);
  const kind = oneOf(sp, "kind", ["all", "offer", "link", "penalty", "payment"] as const, "all");
  const q = str(sp, "q");
  const run = (p: number) => supabase.rpc("my_logs", { p_kind: kind, p_q: likeTerm(q), p_limit: pageSize, p_offset: (p - 1) * pageSize });
  const first = await run(page);
  const total = Number((first.data as Row[] | null)?.[0]?.total ?? 0);
  const current = clampPage(page, total, pageSize);
  const data = current === page ? first.data : (await run(current)).data;
  const [{ count: all }] = await Promise.all([supabase.from("offers").select("id", { count: "exact", head: true })]);
  return { rows: ((data ?? []) as Row[]).map(toRow), total, page: current, pageSize, filters: { q, kind }, hasAny: total > 0 || (all ?? 0) > 0 };
}
