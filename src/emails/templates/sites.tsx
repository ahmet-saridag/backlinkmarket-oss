import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, type Recipient } from "@/emails/types";
import { B, Callout, Cta, EmailShell, Facts, Greeting, Hero, P, Panel, SiteChip, Stats, Steps, Tag } from "@/emails/ui";

/* ───────────────────────── T35 · Site added and verified ───────────────────────── */

type T35 = Recipient & { domain: string; dr: number | null; traffic: string; markets: string[]; pages: number };

function SiteAdded(p: T35 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview={`${p.domain} is verified and live`} reason={`you added ${p.domain}`}>
      <Hero icon="🌐" tone="success" eyebrow="Site added" title={`${p.domain} is verified`} subtitle="It's live in the markets you picked." />
      <Greeting name={p.name} />
      <Panel title={<SiteChip domain={p.domain} />} tag={<Tag tone="success">Active</Tag>}>
        <Facts rows={[["Domain Rating", p.dr === null ? "Not available for this domain" : `DR ${p.dr} · re-read every day`], ["Organic traffic", `${p.traffic} / month`], ["Markets", p.markets.join(" · ")], ["Sitemap", p.pages ? `${p.pages.toLocaleString("en-US")} pages found` : "No sitemap found — buyers type page addresses by hand"]]} />
      </Panel>
      <Steps items={["Set what you accept — DR range, traffic, which pages.", "Add your prices if you sell on the Paid Market.", "Answer offers within 72 hours."]} />
      <Cta href={appUrl(`/sites/${p.domain}`)}>Open your site</Cta>
    </EmailShell>
  );
}

export const t35 = defineEmail<T35>({
  id: "T35",
  name: "Site added and verified",
  group: "Sites & DR",
  to: "Site owner",
  pref: "always",
  priority: "P1",
  Component: SiteAdded,
  subject: (p) => `${p.domain} is verified`,
  fixtures: {
    rated: { label: "With DR and sitemap", props: { name: "Alex", domain: "greenleaf.blog", dr: 31, traffic: "5k–10k", markets: ["Paid", "Exchange", "ABC Pool"], pages: 116 } },
    plain: { label: "Subdomain, no sitemap", props: { name: "Alex", domain: "docs.greenleaf.blog", dr: null, traffic: "1k–5k", markets: ["Exchange"], pages: 0 } },
  },
});

/* ───────────────────────── T36 · Domain Rating changed a lot ───────────────────────── */

type T36 = Recipient & { domain: string; from: number; to: number; days: number };

function DrChanged(p: T36 & { forceDark?: boolean }) {
  const up = p.to > p.from;
  const delta = Math.abs(p.to - p.from);
  return (
    <EmailShell forceDark={p.forceDark} pref="site" preview={`${p.domain}: Domain Rating ${up ? "rose" : "fell"} from ${p.from} to ${p.to}`} reason={`you own ${p.domain}`}>
      <Hero icon={up ? "📈" : "📉"} tone={up ? "success" : "warn"} eyebrow="Domain Rating" title={`${p.domain} ${up ? "rose" : "fell"} ${delta} points`} subtitle={`From DR ${p.from} to DR ${p.to} in ${p.days} days.`} />
      <Greeting name={p.name} />
      <Stats items={[{ label: `${p.days} days ago`, value: p.from }, { label: "Now", value: p.to, tone: up ? "success" : "warn" }, { label: "Change", value: `${up ? "+" : "−"}${delta}`, tone: up ? "success" : "warn" }]} />
      <P>{up ? "Nice. A higher rating can make your site fit more partners' DR ranges, so you may see more matches in Exchange and ABC." : "A lower rating may take your site outside some partners' DR ranges. Existing deals aren't affected."}</P>
      <P small>Domain Rating is read from Ahrefs once a day. You can&apos;t change it.</P>
      <Cta href={appUrl(`/sites/${p.domain}`)}>See your site</Cta>
    </EmailShell>
  );
}

export const t36 = defineEmail<T36>({
  id: "T36",
  name: "Domain Rating changed a lot",
  group: "Sites & DR",
  to: "Site owner",
  pref: "site",
  priority: "P2",
  Component: DrChanged,
  subject: (p) => `${p.domain}: Domain Rating ${p.to > p.from ? "up" : "down"} to ${p.to}`,
  fixtures: {
    up: { label: "Rose", props: { name: "Alex", domain: "greenleaf.blog", from: 24, to: 31, days: 30 } },
    down: { label: "Fell", props: { name: "Alex", domain: "greenleaf.blog", from: 31, to: 22, days: 30 } },
  },
});

/* ───────────────────────── T37 · We couldn't read your Domain Rating ───────────────────────── */

type T37 = Recipient & { domain: string; days: number; lastKnown: number; cause: "unavailable" | "subdomain" };

function DrUnavailable(p: T37 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="site" preview={`We couldn't read the Domain Rating of ${p.domain} for ${p.days} days`} reason={`you own ${p.domain}`}>
      <Hero icon="🛰️" tone="neutral" eyebrow="Domain Rating" title={`We haven't been able to read ${p.domain}'s rating`} subtitle={`${p.days} days in a row.`} />
      <Greeting name={p.name} />
      <P>We keep showing the last rating we had — <B>DR {p.lastKnown}</B> — until we can read a new one. {p.cause === "subdomain" ? "Ahrefs rates whole domains, and this looks like a subdomain: it has no rating of its own, so we don't borrow its parent's." : "Our data source didn't answer. This usually clears by itself."}</P>
      <Callout tone="info" title="Does it affect your deals?">
        No. Offers and live links are unaffected; only new matches by DR use this number.
      </Callout>
      <Cta href={appUrl(`/sites/${p.domain}`)}>Open your site</Cta>
    </EmailShell>
  );
}

export const t37 = defineEmail<T37>({
  id: "T37",
  name: "We couldn't read your Domain Rating",
  group: "Sites & DR",
  to: "Site owner",
  pref: "site",
  priority: "P2",
  Component: DrUnavailable,
  subject: (p) => `We couldn't read the DR of ${p.domain}`,
  fixtures: {
    unavailable: { label: "Source unavailable", props: { name: "Alex", domain: "greenleaf.blog", days: 7, lastKnown: 31, cause: "unavailable" } },
    subdomain: { label: "Subdomain", props: { name: "Alex", domain: "docs.greenleaf.blog", days: 3, lastKnown: 0, cause: "subdomain" } },
  },
});

/* ───────────────────────── T38 · Your sitemap can't be read ───────────────────────── */

type T38 = Recipient & { domain: string; cause: "unreadable" | "dropped"; was?: number; now?: number };

function SitemapProblem(p: T38 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="site" preview={`${p.domain}: we can't read your sitemap`} reason={`you own ${p.domain}`}>
      <Hero icon="🗺️" tone="warn" eyebrow="Sitemap" title={p.cause === "dropped" ? `${p.domain}'s sitemap shrank a lot` : `We can't read ${p.domain}'s sitemap`} subtitle={p.cause === "dropped" ? `From ${p.was?.toLocaleString("en-US")} pages to ${p.now?.toLocaleString("en-US")}.` : "Page picking is limited until it's back."} />
      <Greeting name={p.name} />
      <P>Buyers and swap partners pick the page for a link from your sitemap. Without it they have to type page addresses by hand, which is easier to get wrong.</P>
      <Steps items={[`Open https://${p.domain}/sitemap.xml in a browser — it should list your pages.`, "If it's an index of other sitemaps, that's fine: we read the first 25 of them.", "Once it loads again we pick it up on the next daily read."]} />
      <Cta href={appUrl(`/sites/${p.domain}`)}>Open your site</Cta>
    </EmailShell>
  );
}

export const t38 = defineEmail<T38>({
  id: "T38",
  name: "Your sitemap can't be read",
  group: "Sites & DR",
  to: "Site owner",
  pref: "site",
  priority: "P2",
  Component: SitemapProblem,
  subject: (p) => (p.cause === "dropped" ? `${p.domain}'s sitemap shrank` : `We can't read ${p.domain}'s sitemap`),
  fixtures: {
    unreadable: { label: "Unreadable", props: { name: "Alex", domain: "greenleaf.blog", cause: "unreadable" } },
    dropped: { label: "Page count dropped", props: { name: "Alex", domain: "greenleaf.blog", cause: "dropped", was: 480, now: 12 } },
  },
});

/* ───────────────────────── T39 · Add a payout account ───────────────────────── */

type T39 = Recipient & { trigger: "listing" | "offer"; domain: string };

function AddPayout(p: T39 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="payouts" preview="Add a payout account so buyers can pay you" reason={p.trigger === "offer" ? "an offer is waiting for you" : `you listed ${p.domain} on the Paid Market`}>
      <Hero icon="🏦" tone="warn" eyebrow="One thing missing" title="Add a payout account" subtitle={p.trigger === "offer" ? "An offer is waiting — you can't accept it without one." : `${p.domain} is listed on the Paid Market, but buyers can't pay you yet.`} />
      <Greeting name={p.name} />
      <P>Buyers pay you <B>directly</B> — there&apos;s no escrow — so they need to know where to send the money. Pick the one method you accept:</P>
      <Steps items={["Bank transfer (IBAN) or wire.", "PayPal.", "Crypto — USDT on TRON, Ethereum or BNB Chain."]} />
      <Callout tone="info" title="Only shown to people you accept">
        Your payout details are shown to a buyer only after you accept their offer.
      </Callout>
      <Cta href={appUrl("/account#payments")}>Add payout account</Cta>
    </EmailShell>
  );
}

export const t39 = defineEmail<T39>({
  id: "T39",
  name: "Add a payout account",
  group: "Sites & DR",
  to: "Seller without a payout account",
  pref: "payouts",
  priority: "P1",
  Component: AddPayout,
  subject: (p) => (p.trigger === "offer" ? "Add a payout account to accept your offer" : "Add a payout account so buyers can pay you"),
  fixtures: {
    listing: { label: "After listing a Paid placement", props: { name: "Alex", trigger: "listing", domain: "greenleaf.blog" } },
    offer: { label: "Offer waiting", props: { name: "Alex", trigger: "offer", domain: "greenleaf.blog" } },
  },
});

export const siteEmails = [t35, t36, t37, t38, t39];
