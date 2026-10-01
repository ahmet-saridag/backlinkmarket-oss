import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, marketNames, type Deal, type LinkSpec, type Market, type Recipient } from "@/emails/types";
import { B, Callout, Cta, Countdown, EmailShell, Greeting, Hero, LinkFlow, P, Steps } from "@/emails/ui";

const deal = (market: Market): Deal => ({ ref: "a1b2c3d4e5", market, yourDomain: "greenleaf.blog", otherDomain: "northwind-tools.io", url: appUrl("/offers/a1b2c3d4e5") });
const link: LinkSpec = { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/", anchor: "Northwind tools" };

type Issue = "link_missing" | "nofollow" | "site_down";

const issueText: Record<Issue, { short: string; sentence: string }> = {
  link_missing: { short: "missing", sentence: "is missing from the page" },
  nofollow: { short: "nofollow", sentence: "is marked nofollow" },
  site_down: { short: "unreachable", sentence: "can't be reached — the site seems to be down" },
};

/* ───────────────────────── T20 · Your link needs attention (host) ───────────────────────── */

type T20 = Recipient & { deal: Deal; issue: Issue; link: LinkSpec; windowEnds: string; detectedAt: string };

function NeedsAttentionHost(p: T20 & { forceDark?: boolean }) {
  const down = p.issue === "site_down";
  return (
    <EmailShell forceDark={p.forceDark} pref="disputes" preview={`Your link for ${p.deal.otherDomain} ${issueText[p.issue].sentence}`} reason={`you host a link for ${p.deal.otherDomain}`}>
      <Hero icon="⚠️" tone={down ? "warn" : "danger"} eyebrow="Needs attention" title="Your link needs attention — you have 7 days" subtitle={`We checked twice: the link ${issueText[p.issue].sentence}.`} />
      <Greeting name={p.name} />
      <LinkFlow label={marketNames[p.deal.market]} tone="warn" {...p.link} />
      <Countdown value="7 days" label={`Put it back by ${p.windowEnds}`} tone={down ? "warn" : "danger"} />
      <Steps items={down ? ["Bring your site back online.", "Open the offer and press “Scan again”.", "We re-check every 6 hours until it's back."] : ["Open the page and put the link back exactly as agreed — dofollow, with the agreed anchor.", "Open the offer and press “Scan again”.", "We re-check every 6 hours, so it may clear on its own."]} />
      <Callout tone={down ? "info" : "danger"} title={down ? "No penalty for a site that's down" : "If it isn't fixed in 7 days"}>
        {down ? "If the site stays down for the full 7 days the deal is closed — but nobody is penalised." : "The deal is closed, you get 3 penalty points and your account is banned for 90 days."}
      </Callout>
      <Cta href={p.deal.url} tone={down ? "warn" : "danger"}>
        Fix it and scan again
      </Cta>
    </EmailShell>
  );
}

export const t20 = defineEmail<T20>({
  id: "T20",
  name: "Your link needs attention — 7 days",
  group: "Monitoring",
  to: "Host",
  pref: "disputes",
  priority: "P0",
  Component: NeedsAttentionHost,
  subject: (p) => `Your link for ${p.deal.otherDomain} ${issueText[p.issue].sentence} — 7 days to fix`,
  fixtures: {
    missing: { label: "Link missing", props: { name: "Alex", deal: deal("paid"), issue: "link_missing", link, windowEnds: "Oct 12", detectedAt: "Oct 5" } },
    nofollow: { label: "Marked nofollow", props: { name: "Alex", deal: deal("exchange"), issue: "nofollow", link, windowEnds: "Oct 12", detectedAt: "Oct 5" } },
    down: { label: "Site down", props: { name: "Alex", deal: deal("abc"), issue: "site_down", link, windowEnds: "Oct 12", detectedAt: "Oct 5" } },
  },
});

/* ───────────────────────── T21 · A link to your site needs attention (receiver) ───────────────────────── */

type T21 = Recipient & { deal: Deal; issue: Issue; link: LinkSpec; windowEnds: string };

function NeedsAttentionReceiver(p: T21 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="missing" preview={`The link to your site on ${p.deal.otherDomain} ${issueText[p.issue].sentence}`} reason={`${p.deal.otherDomain} hosts a link to your site`}>
      <Hero icon="👀" tone="warn" eyebrow="Link alert" title="A link to your site needs attention" subtitle={`${p.deal.otherDomain}'s link ${issueText[p.issue].sentence}.`} />
      <Greeting name={p.name} />
      <LinkFlow label={marketNames[p.deal.market]} tone="warn" {...p.link} />
      <P>We&apos;ve told them. <B>You don&apos;t need to do anything.</B> They have until {p.windowEnds} to put it back — we re-check every few hours and will tell you the moment it&apos;s fixed.</P>
      <Callout tone="neutral" title="If it isn't back by then">
        {p.issue === "site_down" ? "The deal is closed. Nobody is penalised for a site that is down." : "The deal is closed and the host is penalised."}
      </Callout>
      <Cta href={p.deal.url}>Follow along</Cta>
    </EmailShell>
  );
}

export const t21 = defineEmail<T21>({
  id: "T21",
  name: "A link to your site needs attention",
  group: "Monitoring",
  to: "Link receiver",
  pref: "missing",
  priority: "P0",
  Component: NeedsAttentionReceiver,
  subject: (p) => `The link to your site on ${p.deal.otherDomain} needs attention`,
  fixtures: { default: { label: "Link missing", props: { name: "Maya", deal: { ...deal("paid"), yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }, issue: "link_missing", link, windowEnds: "Oct 12" } } },
});

/* ───────────────────────── T22 · Last day of the 7-day window ───────────────────────── */

type T22 = Recipient & { deal: Deal; role: "host" | "receiver"; issue: Issue; link: LinkSpec; endsAt: string };

function FinalDay(p: T22 & { forceDark?: boolean }) {
  const host = p.role === "host";
  const down = p.issue === "site_down";
  return (
    <EmailShell forceDark={p.forceDark} pref={host ? "disputes" : "missing"} preview={host ? "24 hours left to put your link back" : `${p.deal.otherDomain} has 24 hours left to put the link back`} reason={host ? `you host a link for ${p.deal.otherDomain}` : `${p.deal.otherDomain} hosts a link to your site`}>
      <Hero icon="🚨" tone={host && !down ? "danger" : "warn"} eyebrow="Final day" title={host ? "24 hours left to put your link back" : `${p.deal.otherDomain} has 24 hours left`} subtitle={host ? "The 7-day window ends today." : "The 7-day window to restore the link ends today."} />
      <Greeting name={p.name} />
      <LinkFlow label="Still not right" tone="danger" {...p.link} />
      <Countdown value="24 h" label={`Window ends ${p.endsAt}`} tone={host && !down ? "danger" : "warn"} />
      {host ? (
        <Callout tone={down ? "info" : "danger"} title="What happens at the end">
          {down ? "The deal is closed. No penalty — the site was down, not removed on purpose." : "The deal is closed, you get 3 penalty points and your account is banned for 90 days."}
        </Callout>
      ) : (
        <Callout tone="neutral" title="What happens at the end">
          {down ? "The deal is closed with no penalty for anyone." : "The deal is closed and the host is penalised. You don't need to do anything."}
        </Callout>
      )}
      {host && (
        <Cta href={p.deal.url} tone="danger">
          Fix it now
        </Cta>
      )}
      {!host && <Cta href={p.deal.url}>Follow along</Cta>}
    </EmailShell>
  );
}

export const t22 = defineEmail<T22>({
  id: "T22",
  name: "Last day of the 7-day window",
  group: "Monitoring",
  to: "Host · receiver",
  pref: "disputes",
  priority: "P0",
  Component: FinalDay,
  subject: (p) => (p.role === "host" ? "24 hours left to put your link back" : `${p.deal.otherDomain} has 24 hours left to put the link back`),
  fixtures: {
    host: { label: "Host (ban warning)", props: { name: "Alex", role: "host", issue: "link_missing", deal: deal("paid"), link, endsAt: "Oct 12 · 23:59 UTC" } },
    host_down: { label: "Host (site down)", props: { name: "Alex", role: "host", issue: "site_down", deal: deal("paid"), link, endsAt: "Oct 12 · 23:59 UTC" } },
    receiver: { label: "Receiver", props: { name: "Maya", role: "receiver", issue: "link_missing", deal: { ...deal("paid"), yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }, link, endsAt: "Oct 12 · 23:59 UTC" } },
  },
});

/* ───────────────────────── T23 · The link is back ───────────────────────── */

type T23 = Recipient & { deal: Deal; role: "host" | "receiver"; link: LinkSpec };

function LinkBack(p: T23 & { forceDark?: boolean }) {
  const host = p.role === "host";
  return (
    <EmailShell forceDark={p.forceDark} pref="missing" preview={host ? "We found your link again — no penalty" : `${p.deal.otherDomain} put the link back`} reason={host ? `you host a link for ${p.deal.otherDomain}` : `${p.deal.otherDomain} hosts a link to your site`}>
      <Hero icon="🎯" tone="success" eyebrow="Back in place" title={host ? "We found your link again" : `${p.deal.otherDomain} put the link back`} subtitle={host ? "No penalty. Monitoring is back to normal." : "It's live, dofollow and checked again."} />
      <Greeting name={p.name} />
      <LinkFlow label="Restored" tone="success" {...p.link} />
      <P>{host ? "Thanks for sorting it out quickly. We'll keep checking the page every day." : "The warning is cleared and the daily checks continue."}</P>
      <Cta href={p.deal.url} tone="success">
        View the link
      </Cta>
    </EmailShell>
  );
}

export const t23 = defineEmail<T23>({
  id: "T23",
  name: "The link is back",
  group: "Monitoring",
  to: "Both sides",
  pref: "missing",
  priority: "P1",
  Component: LinkBack,
  subject: (p) => (p.role === "host" ? "Your link is back — no penalty" : `${p.deal.otherDomain} put the link back`),
  fixtures: {
    host: { label: "Host", props: { name: "Alex", role: "host", deal: deal("paid"), link } },
    receiver: { label: "Receiver", props: { name: "Maya", role: "receiver", deal: { ...deal("paid"), yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }, link } },
  },
});

/* ───────────────────────── T24 · Link removed — you are banned ───────────────────────── */

type T24 = Recipient & { deal: Deal; link: LinkSpec; bannedUntil: string; reason: string };

function RemovedBanned(p: T24 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview={`Your link stayed gone for 7 days — you are banned until ${p.bannedUntil}`} reason="your link stayed missing past its 7-day window">
      <Hero icon="⛔" tone="danger" eyebrow="Account banned" title={`You are banned until ${p.bannedUntil}`} subtitle="The link stayed gone for 7 days after we reported it." />
      <Greeting name={p.name} />
      <LinkFlow label="Not restored" tone="danger" {...p.link} />
      <Callout tone="danger" title="What we saw">
        {p.reason}
      </Callout>
      <P>That is 3 penalty points, which means a 90-day ban. The deal with <B>{p.deal.otherDomain}</B> is closed.</P>
      <Callout tone="neutral" title="While you're banned">
        You can&apos;t send offers or join pools. Deals already running continue as normal. Your sites stay listed.
      </Callout>
      <P small>If you think this is a mistake — for example the link was there and our check was wrong — reply to this email with the page address and we&apos;ll look at it.</P>
      <Cta href={appUrl("/account#standing")}>Trust &amp; standing</Cta>
    </EmailShell>
  );
}

export const t24 = defineEmail<T24>({
  id: "T24",
  name: "Link removed — you are banned",
  group: "Monitoring",
  to: "Host",
  pref: "always",
  priority: "P0",
  Component: RemovedBanned,
  subject: (p) => `You are banned until ${p.bannedUntil}`,
  fixtures: { default: { label: "Banned", props: { name: "Alex", deal: deal("paid"), link, bannedUntil: "Jan 10, 2027", reason: "We loaded greenleaf.blog/best-hiking-boots (75 links on the page) and none of them goes to northwind-tools.io." } } },
});

/* ───────────────────────── T25 · The link to your site was removed — host penalised ───────────────────────── */

type T25 = Recipient & { deal: Deal; link: LinkSpec };

function RemovedPartner(p: T25 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="missing" preview={`${p.deal.otherDomain} removed the link to your site — they were penalised`} reason={`${p.deal.otherDomain} hosted a link to your site`}>
      <Hero icon="🛡️" tone="warn" eyebrow="Deal closed" title={`${p.deal.otherDomain} removed your link`} subtitle="It stayed gone for 7 days, so we closed the deal." />
      <Greeting name={p.name} />
      <LinkFlow label="Removed" tone="danger" {...p.link} />
      <P>We told them the moment it went missing and gave them the full 7 days. They were penalised — <B>3 points and a 90-day ban</B>. Nothing is owed by you.</P>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>Find a replacement</Cta>
    </EmailShell>
  );
}

export const t25 = defineEmail<T25>({
  id: "T25",
  name: "The link to your site was removed — host penalised",
  group: "Monitoring",
  to: "Link receiver",
  pref: "missing",
  priority: "P0",
  Component: RemovedPartner,
  subject: (p) => `${p.deal.otherDomain} removed the link to your site`,
  fixtures: { default: { label: "Removed", props: { name: "Maya", deal: { ...deal("paid"), yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }, link } } },
});

/* ───────────────────────── T26 · Link lost — site stayed down, no penalty ───────────────────────── */

type T26 = Recipient & { deal: Deal; role: "host" | "receiver"; link: LinkSpec };

function SiteDownNoPenalty(p: T26 & { forceDark?: boolean }) {
  const host = p.role === "host";
  return (
    <EmailShell forceDark={p.forceDark} pref="disputes" preview="The link was lost because the site stayed down — no penalty" reason={host ? `you host a link for ${p.deal.otherDomain}` : `${p.deal.otherDomain} hosted a link to your site`}>
      <Hero icon="🔌" tone="neutral" eyebrow="Deal closed — no penalty" title="The site stayed down for 7 days" subtitle="The link is lost, but nobody is penalised." />
      <Greeting name={p.name} />
      <LinkFlow label="Lost" tone="neutral" {...p.link} />
      <P>{host ? "We couldn't reach your site for more than 7 days, so we closed the deal. There's no sign you removed the link on purpose, so there's no penalty." : `${p.deal.otherDomain} couldn't be reached for more than 7 days, so the deal was closed. There's no sign it was on purpose, so nobody is penalised.`}</P>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>{host ? "Back to your offers" : "Find a replacement"}</Cta>
    </EmailShell>
  );
}

export const t26 = defineEmail<T26>({
  id: "T26",
  name: "Link lost — site stayed down, no penalty",
  group: "Monitoring",
  to: "Both sides",
  pref: "disputes",
  priority: "P1",
  Component: SiteDownNoPenalty,
  subject: () => "The link was lost — no penalty",
  fixtures: {
    host: { label: "Host", props: { name: "Alex", role: "host", deal: deal("paid"), link } },
    receiver: { label: "Receiver", props: { name: "Maya", role: "receiver", deal: { ...deal("paid"), yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }, link } },
  },
});

export const monitoringEmails = [t20, t21, t22, t23, t24, t25, t26];
