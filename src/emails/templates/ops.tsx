import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl } from "@/emails/types";
import { Callout, Cta, EmailShell, Facts, Hero, Mono, P, Panel, Stats, Tag } from "@/emails/ui";

/* ───────────────────────── T42 · Dispute opened ───────────────────────── */

type T42 = { offerRef: string; amount: number; buyer: string; seller: string; claimedAt: string; closedAt: string; proofPath: string };

function Dispute(p: T42 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="internal" preview={`Dispute on #${p.offerRef}: seller says the payment didn't arrive`}>
      <Hero icon="⚖️" tone="warn" eyebrow="Ops · dispute" title={`Seller says the $${p.amount} didn't arrive`} subtitle="The buyer attached proof. The offer was closed with no penalty." />
      <Panel title={`Offer #${p.offerRef}`} tag={<Tag tone="warn">Paid</Tag>}>
        <Facts rows={[["Buyer", p.buyer], ["Seller", p.seller], ["Amount", `$${p.amount}`], ["Buyer said paid", p.claimedAt], ["Seller said not received", p.closedAt], ["Proof file", <Mono key="f">{p.proofPath}</Mono>]]} />
      </Panel>
      <P small>Both sides could be telling the truth (a transfer in flight) or one could be lying. Look at the proof before anyone is contacted.</P>
      <Cta href={appUrl(`/offers/${p.offerRef}`)} tone="warn">
        Open the offer
      </Cta>
    </EmailShell>
  );
}

export const t42 = defineEmail<T42>({
  id: "T42",
  name: "Dispute opened — payment didn't arrive",
  group: "Internal",
  to: "Ops",
  pref: "internal",
  priority: "P0",
  Component: Dispute,
  subject: (p) => `[ops] Dispute on #${p.offerRef} — $${p.amount}`,
  fixtures: { default: { label: "Dispute", props: { offerRef: "a1b2c3d4e5", amount: 125, buyer: "northwind-tools.io", seller: "greenleaf.blog", claimedAt: "Oct 3 · 21:12 UTC", closedAt: "Oct 4 · 10:02 UTC", proofPath: "a1b2c3d4-…/3f9c1e.png" } } },
});

/* ───────────────────────── T43 · A ban was applied ───────────────────────── */

type T43 = { account: string; email: string; cause: string; offerRef: string; until: string; points: number };

function BanApplied(p: T43 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="internal" preview={`Ban applied to ${p.account} until ${p.until}`}>
      <Hero icon="⛔" tone="danger" eyebrow="Ops · ban" title={`${p.account} was banned`} subtitle={`Until ${p.until}.`} />
      <Panel title="Decision" tag={<Tag tone="danger">{p.points} pts</Tag>}>
        <Facts rows={[["Account", `${p.account} · ${p.email}`], ["Cause", p.cause], ["Deal", `#${p.offerRef}`], ["Banned until", p.until]]} />
      </Panel>
      <P small>Applied automatically. The banned account was told it can reply to appeal.</P>
      <Cta href={appUrl(`/offers/${p.offerRef}`)} tone="danger">
        Open the deal
      </Cta>
    </EmailShell>
  );
}

export const t43 = defineEmail<T43>({
  id: "T43",
  name: "A ban was applied",
  group: "Internal",
  to: "Ops",
  pref: "internal",
  priority: "P1",
  Component: BanApplied,
  subject: (p) => `[ops] Ban applied: ${p.account}`,
  fixtures: { default: { label: "Ban", props: { account: "Alex Rivera", email: "alex@example.com", cause: "Link removed and not restored within 7 days", offerRef: "a1b2c3d4e5", until: "Jan 10, 2027", points: 3 } } },
});

/* ───────────────────────── T44 · System alert ───────────────────────── */

type T44 = { severity: "warning" | "critical"; what: string; detail: string; queue: { live: number; dueNow: number; oldestDueMinutes: number; leased: number; unreachable: number }; at: string };

function SystemAlert(p: T44 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="internal" preview={`[${p.severity}] ${p.what}`}>
      <Hero icon={p.severity === "critical" ? "🚨" : "⚠️"} tone={p.severity === "critical" ? "danger" : "warn"} eyebrow={`Ops · ${p.severity}`} title={p.what} subtitle={p.detail} />
      <Stats items={[{ label: "Live links", value: p.queue.live }, { label: "Due now", value: p.queue.dueNow, tone: p.queue.dueNow > 100 ? "warn" : undefined }, { label: "Oldest due", value: `${p.queue.oldestDueMinutes}m`, tone: p.queue.oldestDueMinutes > 30 ? "danger" : undefined }]} />
      <Panel title="Queue">
        <Facts rows={[["Leased right now", String(p.queue.leased)], ["Sites unreachable", String(p.queue.unreachable)], ["Seen at", p.at]]} />
      </Panel>
      <Callout tone="neutral" title="Where to look">
        The scan worker&apos;s stats (<Mono>/api/cron/scan-links?stats=1</Mono>), the pg_cron job history, and the Vercel function logs.
      </Callout>
      <Cta href={appUrl("/")} tone={p.severity === "critical" ? "danger" : "warn"}>
        Open the app
      </Cta>
    </EmailShell>
  );
}

export const t44 = defineEmail<T44>({
  id: "T44",
  name: "System alert",
  group: "Internal",
  to: "Ops",
  pref: "internal",
  priority: "P0",
  Component: SystemAlert,
  subject: (p) => `[${p.severity}] ${p.what}`,
  fixtures: {
    backlog: { label: "Scan queue backing up", props: { severity: "critical", what: "The link scan queue is backing up", detail: "The oldest due link has waited more than 30 minutes.", queue: { live: 5400, dueNow: 412, oldestDueMinutes: 47, leased: 0, unreachable: 18 }, at: "Oct 4 · 03:12 UTC" } },
    dr: { label: "DR refresh failing", props: { severity: "warning", what: "Domain Rating reads are failing", detail: "Over a third of today's reads didn't come back.", queue: { live: 5400, dueNow: 12, oldestDueMinutes: 4, leased: 12, unreachable: 3 }, at: "Oct 4 · 03:30 UTC" } },
  },
});

export const opsEmails = [t42, t43, t44];
