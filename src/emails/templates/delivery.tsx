import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, marketNames, type Deal, type LinkSpec, type Market, type Recipient } from "@/emails/types";
import { B, Callout, Checks, Cta, EmailShell, Facts, Greeting, Hero, LinkFlow, P, Panel, PoolLoop, Problems, Stats } from "@/emails/ui";

const deal = (market: Market, extra: Partial<Deal> = {}): Deal => ({ ref: "a1b2c3d4e5", market, yourDomain: "greenleaf.blog", otherDomain: "northwind-tools.io", url: appUrl("/offers/a1b2c3d4e5"), ...extra });
const link: LinkSpec = { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/", anchor: "Northwind tools" };

/* ───────────────────────── T13 · We couldn't verify your link ───────────────────────── */

type T13 = Recipient & { deal: Deal; attempt: number; problems: { label: string; reason: string }[]; deadline: string; stuck?: boolean };

function CheckFailed(p: T13 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="disputes" preview={p.stuck ? "We couldn't finish checking your page — press the button again" : "We couldn't find everything on your page"} reason={`you said a link was placed for ${p.deal.otherDomain}`}>
      <Hero icon="🔎" tone="warn" eyebrow={`Check ${p.attempt} didn't pass`} title={p.stuck ? "We couldn't finish checking your page" : "We couldn't find everything on your page"} subtitle={p.stuck ? "Something interrupted our check. Nothing is wrong on your side yet." : "Here's exactly what we saw."} />
      <Greeting name={p.name} />
      <Problems items={p.problems} />
      <Panel title="What to do">
        <Facts rows={[["1", "Fix it on your site."], ["2", <span key="2">Press <B>“I&apos;ve fixed it — check again”</B> on the offer.</span>], ["3", "We look again straight away. We repeat this with you until every link is there."]]} />
      </Panel>
      <Callout tone="warn" title={`Still due by ${p.deadline}`}>
        The original 72 hours keep running while you fix it.
      </Callout>
      <Cta href={p.deal.url} tone="warn">
        Open the offer
      </Cta>
    </EmailShell>
  );
}

export const t13 = defineEmail<T13>({
  id: "T13",
  name: "We couldn't verify your link",
  group: "Delivery",
  to: "Host (who placed the link)",
  pref: "disputes",
  priority: "P0",
  Component: CheckFailed,
  subject: (p) => (p.stuck ? "We couldn't finish checking your page" : `We couldn't find your link for ${p.deal.otherDomain}`),
  fixtures: {
    missing: { label: "Link not found", props: { name: "Alex", deal: deal("paid"), attempt: 1, deadline: "Sun, Oct 5 · 00:24", problems: [{ label: "Link Insertion: “Northwind” on greenleaf.blog/best-hiking-boots", reason: "We loaded the page (75 links) and none of them goes to northwind-tools.io." }] } },
    nofollow: { label: "Marked nofollow", props: { name: "Alex", deal: deal("exchange"), attempt: 2, deadline: "Sun, Oct 5 · 00:24", problems: [{ label: "Link Insertion: “Northwind tools”", reason: "The link is on the page but it is marked rel=\"nofollow\" — it has to be a normal dofollow link." }] } },
    stuck: { label: "Check stuck", props: { name: "Alex", deal: deal("abc"), attempt: 1, stuck: true, deadline: "Sun, Oct 5 · 00:24", problems: [{ label: "Your page", reason: "We could not finish checking it — press the button again." }] } },
  },
});

/* ───────────────────────── T14 · Link verified and live ───────────────────────── */

type T14 = Recipient & { deal: Deal; role: "receiver" | "host"; link: LinkSpec; until?: string };

function LinkLive(p: T14 & { forceDark?: boolean }) {
  const receiver = p.role === "receiver";
  return (
    <EmailShell forceDark={p.forceDark} pref="payouts" preview={receiver ? `Your link on ${p.deal.otherDomain} is live` : `Your link for ${p.deal.otherDomain} checked out`} reason={receiver ? `${p.deal.otherDomain} placed a link to your site` : `you placed a link for ${p.deal.otherDomain}`}>
      <Hero icon="🔗" tone="success" eyebrow="Verified" title={receiver ? `Your link on ${p.deal.otherDomain} is live` : "Your link checked out — it's live"} subtitle={receiver ? "We opened the page ourselves and checked it." : "We opened your page and every link was there."} />
      <Greeting name={p.name} />
      <LinkFlow label={marketNames[p.deal.market]} tone="success" {...p.link} />
      <Checks items={[{ ok: true, label: "The page loads" }, { ok: true, label: "The link is on it" }, { ok: true, label: "It's a normal dofollow link" }, { ok: true, label: "The anchor text matches" }]} />
      <Callout tone="info" title="Checked every day">
        We re-read the page daily. {p.until ? `This placement runs until ${p.until}.` : "If the link ever disappears, both of you are told."}
      </Callout>
      <Cta href={p.deal.url} tone="success">
        View the link
      </Cta>
    </EmailShell>
  );
}

export const t14 = defineEmail<T14>({
  id: "T14",
  name: "Link verified and live",
  group: "Delivery",
  to: "Receiver · host",
  pref: "payouts",
  priority: "P0",
  Component: LinkLive,
  subject: (p) => (p.role === "receiver" ? `Your link on ${p.deal.otherDomain} is live` : `Your link for ${p.deal.otherDomain} is verified`),
  fixtures: {
    receiver: { label: "Receiver", props: { name: "Maya", role: "receiver", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), link: { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/seo-audit", anchor: "free SEO audit" }, until: "Oct 3, 2027" } },
    host: { label: "Host", props: { name: "Alex", role: "host", deal: deal("exchange"), link } },
  },
});

/* ───────────────────────── T15 · Swap complete ───────────────────────── */

type T15 = Recipient & { deal: Deal; youGet: LinkSpec; youGive: LinkSpec };

function SwapComplete(p: T15 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={`Swap complete — both links are live`} reason={`you swapped links with ${p.deal.otherDomain}`}>
      <Hero icon="🤝" tone="success" eyebrow="Swap complete" title={`You and ${p.deal.otherDomain} are linked`} subtitle="Both links are up and verified." />
      <Greeting name={p.name} />
      <LinkFlow label="You got" tone="success" {...p.youGet} />
      <LinkFlow label="You gave" tone="warn" {...p.youGive} />
      <P>Both pages are checked every day. If either link goes missing, you&apos;ll both be told and the one who removed it has 7 days to put it back.</P>
      <Cta href={p.deal.url} tone="success">
        View the swap
      </Cta>
    </EmailShell>
  );
}

export const t15 = defineEmail<T15>({
  id: "T15",
  name: "Swap complete (both links live)",
  group: "Delivery",
  to: "Both sides",
  pref: "offers",
  priority: "P1",
  Component: SwapComplete,
  subject: (p) => `Swap complete with ${p.deal.otherDomain}`,
  fixtures: { default: { label: "Complete", props: { name: "Alex", deal: deal("exchange"), youGet: { from: "northwind-tools.io", to: "greenleaf.blog", page: "northwind-tools.io/blog/outdoor-gear", target: "greenleaf.blog/", anchor: "Greenleaf" }, youGive: link } } },
});

/* ───────────────────────── T16 · Pool complete ───────────────────────── */

type T16 = Recipient & { deal: Deal; seats: string[]; poolRef: string };

function PoolComplete(p: T16 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="pools" preview={`Pool #${p.poolRef} is complete — all three links are live`} reason={`you're in ABC pool #${p.poolRef}`}>
      <Hero icon="🔺" tone="success" eyebrow="Loop complete" title={`Pool #${p.poolRef}: all three links are live`} subtitle="Everyone placed theirs. The loop is closed." />
      <Greeting name={p.name} />
      <PoolLoop seats={p.seats} you={p.deal.yourDomain} />
      <P>Each link is checked every day. If one disappears the member who hosts it has 7 days to restore it.</P>
      <Cta href={p.deal.url} tone="success">
        See the pool
      </Cta>
    </EmailShell>
  );
}

export const t16 = defineEmail<T16>({
  id: "T16",
  name: "Pool complete (all three links live)",
  group: "Delivery",
  to: "The 3 members",
  pref: "pools",
  priority: "P1",
  Component: PoolComplete,
  subject: (p) => `Pool #${p.poolRef} is complete`,
  fixtures: { default: { label: "Complete", props: { name: "Alex", poolRef: "7QK2M9", deal: deal("abc"), seats: ["greenleaf.blog", "northwind-tools.io", "acme-seo.com"] } } },
});

/* ───────────────────────── T17 · Placement ends soon ───────────────────────── */

type T17 = Recipient & { deal: Deal; daysLeft: 30 | 7; endsOn: string; link: LinkSpec };

function TermEnding(p: T17 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="monitoring" preview={`Your link on ${p.deal.otherDomain} ends in ${p.daysLeft} days`} reason={`a timed placement on ${p.deal.otherDomain} is ending`}>
      <Hero icon="📅" tone="warn" eyebrow={`${p.daysLeft} days left`} title={`Your link on ${p.deal.otherDomain} ends on ${p.endsOn}`} subtitle="Renew it if you want to keep the link." />
      <Greeting name={p.name} />
      <LinkFlow label="Timed placement" tone="warn" {...p.link} />
      <P>After {p.endsOn} the placement counts as complete and we stop checking it. The host may leave the link up, but it&apos;s no longer guaranteed.</P>
      <Cta href={appUrl(`/listing/${p.deal.otherDomain}`)}>Renew the placement</Cta>
    </EmailShell>
  );
}

export const t17 = defineEmail<T17>({
  id: "T17",
  name: "Placement ends soon (30 d / 7 d)",
  group: "Delivery",
  to: "Link receiver (and host, informational)",
  pref: "monitoring",
  priority: "P1",
  Component: TermEnding,
  subject: (p) => `Your link on ${p.deal.otherDomain} ends in ${p.daysLeft} days`,
  fixtures: {
    d30: { label: "30 days", props: { name: "Maya", daysLeft: 30, endsOn: "Nov 3, 2026", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), link: { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/seo-audit", anchor: "free SEO audit" } } },
    d7: { label: "7 days", props: { name: "Maya", daysLeft: 7, endsOn: "Nov 3, 2026", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), link: { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/seo-audit", anchor: "free SEO audit" } } },
  },
});

/* ───────────────────────── T18 · Placement term ended ───────────────────────── */

type T18 = Recipient & { deal: Deal; link: LinkSpec; months: number; days: number };

function TermEnded(p: T18 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={`Placement complete — the link on ${p.deal.otherDomain} did its ${p.months} months`} reason={`a timed placement on a deal of yours ended`}>
      <Hero icon="🏁" tone="success" eyebrow="Deal complete" title="The placement ran its full term" subtitle={`${p.months} months, checked every day.`} />
      <Greeting name={p.name} />
      <LinkFlow label="Completed" tone="success" {...p.link} />
      <Stats items={[{ label: "Term", value: `${p.months} mo` }, { label: "Days monitored", value: p.days }, { label: "Result", value: "Kept", tone: "success" }]} />
      <P>We&apos;ve stopped checking this link. Thanks for trading fair.</P>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>Find your next placement</Cta>
    </EmailShell>
  );
}

export const t18 = defineEmail<T18>({
  id: "T18",
  name: "Placement term ended — deal complete",
  group: "Delivery",
  to: "Both sides",
  pref: "offers",
  priority: "P1",
  Component: TermEnded,
  subject: (p) => `Placement on ${p.deal.otherDomain} complete`,
  fixtures: { default: { label: "Term ended", props: { name: "Maya", months: 6, days: 182, deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), link: { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/seo-audit", anchor: "free SEO audit" } } } },
});

export const deliveryEmails = [t13, t14, t15, t16, t17, t18];
