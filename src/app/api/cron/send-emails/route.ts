import { createClient } from "@supabase/supabase-js";
import type { EmailContext } from "@/emails/build";
import { prepareEmail } from "@/emails/outbox";
import { sendViaResend } from "@/emails/send";

// The email sender. pg_cron calls it every minute with `Authorization: Bearer <secret>`. It takes the next emails from the
// outbox (the database leases them, so two runs never take the same one), has the database gather what each one needs,
// writes it, sends it through Resend and records the result. Nothing here holds a database key of its own.
//   ?stats=1                 how the outbox is doing
//   ?preview=1&id=N          what outbox row N would send — nothing is sent or recorded
//   ?send_to=a@b.c&id=N      send row N to that address instead — nothing is recorded (a test of the real email)
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PER_RUN = 25;
const BUDGET_MS = 45_000;
const GAP_MS = 250;

type Claimed = { id: number; template: string };

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data: allowed } = secret ? await db.rpc("cron_ping", { p_secret: secret }) : { data: false };
  if (!allowed) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  if (sp.get("stats")) {
    const { data, error } = await db.rpc("cron_email_stats", { p_secret: secret });
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json(data);
  }

  const context = async (id: number) => ((await db.rpc("cron_email_context", { p_secret: secret, p_id: id })).data ?? null) as EmailContext | null;

  // Looking at one row, without touching it
  const only = Number(sp.get("id"));
  if (only && (sp.get("preview") || sp.get("send_to"))) {
    const ctx = await context(only);
    if (!ctx) return Response.json({ error: "No such outbox row" }, { status: 404 });
    const out = await prepareEmail(ctx);
    if (typeof out.skip === "string") return Response.json({ template: ctx.outbox.template, skipped: out.skip });
    const target = sp.get("send_to");
    if (target) {
      const sent = await sendViaResend({ to: target, subject: `[Test] ${out.subject}`, html: out.html, text: out.text, key: `test:${only}:${Date.now()}` });
      return Response.json({ template: ctx.outbox.template, to: target, subject: out.subject, sent });
    }
    return Response.json({ template: ctx.outbox.template, to: out.to, subject: out.subject, htmlBytes: out.html.length, textBytes: out.text.length, text: out.text.slice(0, 1500) });
  }

  const { data: claimed, error } = await db.rpc("cron_claim_emails", { p_secret: secret, p_limit: PER_RUN });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (claimed ?? []) as Claimed[];
  const counts = { claimed: rows.length, sent: 0, skipped: 0, retry: 0, failed: 0 };
  const deadline = Date.now() + BUDGET_MS;
  const finish = (id: number, outcome: string, providerId: string | null, err: string | null) =>
    db.rpc("cron_finish_email", { p_secret: secret, p_id: id, p_outcome: outcome, p_provider_id: providerId, p_error: err });

  for (const row of rows) {
    // Out of time: the rest keep their lease for a few minutes and are taken next run
    if (Date.now() > deadline) break;
    try {
      const ctx = await context(row.id);
      if (!ctx) {
        await finish(row.id, "skipped", null, "the thing it was about is gone");
        counts.skipped++;
        continue;
      }
      const out = await prepareEmail(ctx);
      if (typeof out.skip === "string") {
        await finish(row.id, "skipped", null, out.skip);
        counts.skipped++;
        continue;
      }
      const sent = await sendViaResend({ to: out.to, subject: out.subject, html: out.html, text: out.text, key: ctx.outbox.key });
      if (sent.ok) {
        await finish(row.id, "sent", sent.id, null);
        counts.sent++;
      } else if (sent.retry) {
        await finish(row.id, "retry", null, sent.error);
        counts.retry++;
      } else {
        await finish(row.id, "failed", null, sent.error);
        counts.failed++;
      }
    } catch (e) {
      await finish(row.id, "retry", null, e instanceof Error ? e.message : "error");
      counts.retry++;
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  return Response.json(counts);
}
