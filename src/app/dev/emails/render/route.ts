import { notFound } from "next/navigation";
import { renderEmail } from "@/emails/render";

// Preview of one email variant — development only.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = new URL(request.url).searchParams;
  const out = await renderEmail(sp.get("id") ?? "", sp.get("v") ?? undefined, { forceDark: sp.get("theme") === "dark" });
  if (!out) return new Response("Unknown email", { status: 404 });
  if (sp.get("format") === "text") return new Response(`Subject: ${out.subject}\n\n${out.text}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(out.html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Email-Subject": encodeURIComponent(out.subject) } });
}
