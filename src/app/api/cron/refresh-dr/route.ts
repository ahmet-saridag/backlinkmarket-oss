import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { checkSitemap } from "@/lib/sitemap";
import { DrUnavailableError, fetchDomainMetrics } from "@/lib/site-verification";

// Read every site's Domain Rating from Ahrefs (and its sitemap's page count), once a day per site. The database scheduler (pg_cron) calls this once a day
// (03:00 UTC) and the worker then chains itself with `Authorization: Bearer <secret>`; the same secret unlocks the two database functions that list what is due
// and store the result, so nothing here needs a privileged database key.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PER_RUN = 150;
const CONCURRENCY = 5;

export async function GET(request: Request) {
  // The caller's secret is checked by the database (it keeps only a hash), and the same secret then unlocks its functions
  const secret = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data: allowed } = secret ? await db.rpc("cron_ping", { p_secret: secret }) : { data: false };
  if (!allowed) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: due, error } = await db.rpc("cron_sites_for_dr_refresh", { p_secret: secret, p_limit: PER_RUN });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const sites = (due ?? []) as { id: string; domain: string }[];
  let updated = 0;
  let failed = 0;
  const deadline = Date.now() + 50_000;

  // A few at a time: Ahrefs' free endpoint is happy with that and the run stays inside the function's time limit.
  for (let i = 0; i < sites.length && Date.now() < deadline; i += CONCURRENCY) {
    await Promise.all(
      sites.slice(i, i + CONCURRENCY).map(async (s) => {
        // The site's page count is read in the same daily pass; a site without a readable sitemap keeps its last count
        try {
          const map = await checkSitemap(s.domain);
          if (map.found) await db.rpc("cron_apply_sitemap", { p_secret: secret, p_id: s.id, p_count: map.total });
        } catch {
          // never holds up the DR reading
        }
        try {
          // A subdomain has no DR of its own: keep it at 0 (and stop asking every night)
          const dr = await fetchDomainMetrics(s.domain).then((m) => m.dr, (e) => (e instanceof DrUnavailableError ? 0 : Promise.reject(e)));
          const { error: applyError } = await db.rpc("cron_apply_dr", { p_secret: secret, p_id: s.id, p_dr: dr });
          if (applyError) throw applyError;
          updated++;
        } catch {
          // Ahrefs down or the domain not rated: keep yesterday's DR, and it's picked up again on the next run
          failed++;
        }
      }),
    );
  }
  // A full batch means more may be waiting: carry on in a fresh invocation, so one daily trigger drains the whole queue
  const hop = Number(request.headers.get("x-hop") ?? 0);
  if (sites.length === PER_RUN && hop < 2000) {
    const next = new URL(request.url);
    after(() => fetch(next, { headers: { authorization: `Bearer ${secret}`, "x-hop": String(hop + 1) } }).then(() => undefined, () => undefined));
  }
  return Response.json({ due: sites.length, updated, failed, hop });
}
