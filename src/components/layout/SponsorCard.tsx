"use client";

import { ArrowUpRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SiteFavicon } from "@/components/shared/SiteFavicon";

/*
 * Sponsor slot (sidebar card, one native row on the public market list): Bold Pilot (boldpilot.club) — an AI agent that runs SEO on autopilot: it finds
 * keywords a site can actually win, writes the articles and publishes them, so the site ranks on Google
 * and gets cited by AI assistants. Copy lives here so it can be swapped without touching the layout.
 */
export const sponsor = {
  name: "Bold Pilot",
  domain: "boldpilot.club",
  href: "https://boldpilot.club/?ref=backlinkmarket",
  pitch: "Rank on Google and get cited by AI answers — on autopilot.",
  cta: "Try Bold Pilot",
};

// Where Bold Pilot gets you seen: Google plus the AI assistants that cite sources.
export const engines: { name: string; domain: string; size?: number }[] = [
  { name: "Google", domain: "google.com" },
  { name: "ChatGPT", domain: "chatgpt.com" },
  // Claude's and Perplexity's icons fill their whole square, so they sit a size down to look even
  { name: "Claude", domain: "claude.ai", size: 15 },
  { name: "Gemini", domain: "gemini.google.com" },
  { name: "Perplexity", domain: "perplexity.ai", size: 15 },
  { name: "Grok", domain: "grok.com" },
];

function Logo({ size = 16 }: { size?: number }) {
  return <SiteFavicon domain={sponsor.domain} size={size} className="rounded-[5px]" />;
}

/** Small sponsored card at the bottom of the sidebar; just Bold Pilot's logo when the sidebar is collapsed. */
export function SponsorCard({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={sponsor.href}
              target="_blank"
              rel="sponsored noopener"
              aria-label={`${sponsor.name} (sponsored)`}
              className="mx-auto grid size-9 place-items-center rounded-full border bg-card shadow-sm"
            />
          }
        >
          <Logo size={18} />
        </TooltipTrigger>
        <TooltipContent side="right">
          {sponsor.name} · SEO on autopilot · Sponsored
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <a
      href={sponsor.href}
      target="_blank"
      rel="sponsored noopener"
      className="group flex flex-col gap-2.5 rounded-2xl border bg-card/60 p-3 transition-colors hover:border-foreground/20"
    >
      <EngineStack />
      <span className="text-[13px] leading-snug text-muted-foreground">{sponsor.pitch}</span>
      <span className="flex items-center gap-1.5 text-[13px] font-medium">
        <Logo />
        {sponsor.cta}
        <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        <span className="ml-auto text-[10px] font-normal tracking-wide text-muted-foreground/60 uppercase">Ad</span>
      </span>
    </a>
  );
}

/** The engines Bold Pilot gets you seen on, as overlapping white circles. */
export function EngineStack({ circle = 28 }: { circle?: number }) {
  return (
    <span className="flex -space-x-1.5" aria-label={engines.map((e) => e.name).join(", ")}>
      {engines.map((e) => (
        <span
          key={e.domain}
          title={e.name}
          className="grid place-items-center rounded-full border-2 border-card bg-white"
          style={{ width: circle, height: circle }}
        >
          <SiteFavicon domain={e.domain} size={Math.round((e.size ?? 20) * (circle / 28))} className="bg-transparent" />
        </span>
      ))}
    </span>
  );
}
