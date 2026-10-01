import { createClient } from "@supabase/supabase-js";
import { createPageCache } from "@/lib/link-check";
import { checkOfferLinks } from "@/lib/offer-links";
import type { OfferBriefLine } from "@/lib/types";

// The link monitor's worker. Every call takes the next batch of live links that are due (the database hands each one
// to a single worker, and frees it again if that worker dies), opens each distinct page once, and stores what it found.
// What is due, and when each link is looked at next, lives in the database (see `cron_claim_scans` / `cron_apply_scan`).
// Called from outside on a schedule with `Authorization: Bearer $CRON_SECRET`; `?stats=1` only reports the queue's health.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PER_RUN = 150;
const CONCURRENCY = 12;
const BUDGET_MS = 45_000;

type Claimed = {
  id: string;
  seller_domain: string;
  buyer_domain: string;
  brief: OfferBriefLine[] | null;
  deliveries: Record<string, string> | null;
};

export async function GET(request: Request) {
  // The caller's secret is checked by the database (it keeps only a hash), and the same secret then unlocks its functions
  const secret = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data: allowed } = secret ? await db.rpc("cron_ping", { p_secret: secret }) : { data: false };
  if (!allowed) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (new URL(request.url).searchParams.get("stats")) {
    const { data, error } = await db.rpc("cron_scan_stats", { p_secret: secret });
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json(data);
  }

  const { data: claimed, error } = await db.rpc("cron_claim_scans", { p_secret: secret, p_limit: PER_RUN });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const offers = (claimed ?? []) as Claimed[];
  const cache = createPageCache(2);
  const deadline = Date.now() + BUDGET_MS;
  const counts: Record<string, number> = { ok: 0, missing: 0, nofollow: 0, anchor_changed: 0, unreachable: 0, errors: 0, skipped: 0 };

  for (let i = 0; i < offers.length; i += CONCURRENCY) {
    if (Date.now() > deadline) {
      // Out of time: what we didn't reach keeps its lease for a few minutes, then is handed out again
      counts.skipped += offers.length - i;
      break;
    }
    await Promise.all(
      offers.slice(i, i + CONCURRENCY).map(async (o) => {
        try {
          const check = await checkOfferLinks({ brief: o.brief ?? [], sellerDomain: o.seller_domain, buyerDomain: o.buyer_domain, deliveries: o.deliveries ?? {}, cache });
          const { error: applyError } = await db.rpc("cron_apply_scan", {
            p_secret: secret,
            p_id: o.id,
            p_outcome: check.outcome,
            p_link_status: check.status,
            p_detail: check.problems[0]?.reason ?? null,
          });
          if (applyError) throw applyError;
          counts[check.outcome]++;
        } catch {
          // Our own failure: leave it, the lease runs out and it comes round again
          counts.errors++;
        }
      }),
    );
  }
  return Response.json({ claimed: offers.length, ...counts });
}
