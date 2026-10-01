import { NextResponse } from "next/server";
import { APP_URL } from "@/lib/app-url";

// ai.txt: an emerging (non-standard) way to state AI crawler and usage permissions in plain language,
// next to the machine-readable rules in robots.ts. Mirrors the bots named there.
export async function GET() {
  const content = `# ai.txt for ${APP_URL}

User-Agent: *
Allow: /
Disallow: /api/
Disallow: /auth/

# Backlink Market welcomes AI crawlers, answer engines and LLMs to read, index and cite the public
# listings and pages. Citation and training are both permitted. Signed-in areas are not public.

Allowed-Agents: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot,
  PerplexityBot, Perplexity-User, Google-Extended, Applebot, Applebot-Extended, CCBot

Content-Usage: allow
Content-Usage-Training: allow

Contact: ${APP_URL}
Sitemap: ${APP_URL}/sitemap.xml
LLMs: ${APP_URL}/llms.txt
LLMs-Full: ${APP_URL}/llms-full.txt
`;
  return new NextResponse(content, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
