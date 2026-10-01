import "server-only";

const FROM = process.env.EMAIL_FROM ?? "Backlink Market <notifications@backlinkmarket.co>";
const REPLY_TO = process.env.SUPPORT_EMAIL ?? "ahmet.saridagj@gmail.com";

export type SendResult = { ok: true; id: string } | { ok: false; retry: boolean; error: string };

/** One email through Resend. The idempotency key means a retry after a timeout can never become a second email. */
export async function sendViaResend(input: { to: string; subject: string; html: string; text: string; key: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, retry: false, error: "RESEND_API_KEY is not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.key.slice(0, 256), "User-Agent": "backlinkmarket/1.0" },
      body: JSON.stringify({ from: FROM, to: [input.to], reply_to: REPLY_TO, subject: input.subject, html: input.html, text: input.text }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (res.ok && body.id) return { ok: true, id: body.id };
    // Rate limits and Resend's own trouble are worth another try; a rejected address or message is not
    return { ok: false, retry: res.status === 429 || res.status >= 500, error: `${res.status} ${body.message ?? ""}`.trim() };
  } catch (e) {
    return { ok: false, retry: true, error: e instanceof Error ? e.message : "network error" };
  }
}
