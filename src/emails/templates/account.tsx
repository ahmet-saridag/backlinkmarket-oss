import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, type Recipient } from "@/emails/types";
import { B, Callout, Cta, EmailShell, Greeting, Hero, P, Panel, SiteChip, Stats, Steps, Tag } from "@/emails/ui";

/* ───────────────────────── T40 · Welcome ───────────────────────── */

type T40 = Recipient;

function Welcome(p: T40 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview="Welcome to Backlink Market — three ways to trade links" reason="you created an account">
      <Hero icon="👋" tone="info" eyebrow="Welcome" title="Welcome to Backlink Market" subtitle="Three ways to trade links, no middleman holding your money." />
      <Greeting name={p.name} />
      <P>Add your site, pick how you want to trade, and we check every link ourselves — daily, for as long as it lives.</P>
      <Panel title="Pick a market">
        <Steps items={[<span key="1"><B>Paid Market</B> — sellers list placements; buyers pay them directly.</span>, <span key="2"><B>Exchange</B> — a one-to-one link swap. Nothing is paid.</span>, <span key="3"><B>ABC Pool</B> — three sites, each links to the next.</span>]} />
      </Panel>
      <Callout tone="info" title="Three things to know">
        You have 72 hours for every step. We verify links, so nobody has to trust anybody. Missing a deadline costs penalty points — three in a month is a 90-day ban.
      </Callout>
      <Cta href={appUrl("/sites/new")}>Add your first site</Cta>
    </EmailShell>
  );
}

export const t40 = defineEmail<T40>({
  id: "T40",
  name: "Welcome",
  group: "Account",
  to: "New account",
  pref: "always",
  priority: "P1",
  Component: Welcome,
  subject: () => "Welcome to Backlink Market",
  fixtures: { default: { label: "Welcome", props: { name: "Alex" } } },
});

/* ───────────────────────── T41 · Weekly summary ───────────────────────── */

type T41 = Recipient & {
  week: string;
  live: number;
  expiring: number;
  attention: number;
  drChange: number;
  needsYou: { text: string; domain: string }[];
  newLinks: { domain: string; page: string }[];
};

function Weekly(p: T41 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="digest" preview={`Your week: ${p.live} links live, ${p.attention} need attention`} reason="you turned on the weekly summary">
      <Hero icon="🗓️" tone="info" eyebrow={`Week of ${p.week}`} title="Your links this week" subtitle="Everything we checked, in one place." />
      <Greeting name={p.name} />
      <Stats items={[{ label: "Live links", value: p.live, tone: "success" }, { label: "Ending in 30 days", value: p.expiring, tone: p.expiring ? "warn" : undefined }, { label: "Need attention", value: p.attention, tone: p.attention ? "danger" : undefined }]} />
      {p.needsYou.length > 0 && (
        <Panel title="Needs you" tag={<Tag tone="warn">{p.needsYou.length}</Tag>}>
          <Steps items={p.needsYou.map((n) => <span key={n.text}><SiteChip domain={n.domain} /> — {n.text}</span>)} />
        </Panel>
      )}
      {p.newLinks.length > 0 && (
        <Panel title="New this week" tag={<Tag tone="success">{p.newLinks.length}</Tag>}>
          {p.newLinks.map((l) => (
            <P key={l.page} small>
              <SiteChip domain={l.domain} strong={false} /> · {l.page}
            </P>
          ))}
        </Panel>
      )}
      <P small>Domain Rating moved {p.drChange > 0 ? `+${p.drChange}` : p.drChange === 0 ? "not at all" : p.drChange} across your sites over the last 30 days.</P>
      <Cta href={appUrl("/backlinks")}>Open Backlinks</Cta>
    </EmailShell>
  );
}

export const t41 = defineEmail<T41>({
  id: "T41",
  name: "Weekly summary",
  group: "Account",
  to: "Site owner",
  pref: "digest",
  priority: "P2",
  Component: Weekly,
  subject: (p) => `Your week: ${p.live} links live${p.attention ? `, ${p.attention} need attention` : ""}`,
  fixtures: {
    busy: { label: "Busy week", props: { name: "Alex", week: "Sep 29", live: 14, expiring: 2, attention: 1, drChange: 3, needsYou: [{ domain: "northwind-tools.io", text: "link missing — 5 days left to put it back" }, { domain: "acme-seo.com", text: "an offer is waiting for your answer" }], newLinks: [{ domain: "northwind-tools.io", page: "/blog/outdoor-gear" }, { domain: "acme-seo.com", page: "/guides/link-building" }] } },
    quiet: { label: "Quiet week", props: { name: "Alex", week: "Sep 29", live: 6, expiring: 0, attention: 0, drChange: 0, needsYou: [], newLinks: [] } },
  },
});

export const accountEmails = [t40, t41];
