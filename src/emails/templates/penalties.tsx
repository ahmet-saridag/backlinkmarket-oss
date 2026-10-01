import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, type Recipient } from "@/emails/types";
import { B, Callout, Cta, EmailShell, Facts, Greeting, Hero, P, Panel, PenaltyMeter, Steps } from "@/emails/ui";

type Reason = "no_response" | "payment_not_sent" | "no_delivery" | "one_sided";

const reasons: Record<Reason, { label: string; what: string; avoid: string }> = {
  no_response: { label: "You didn't answer an offer in 72 hours", what: "An offer sent to you expired without an answer.", avoid: "Accept or decline offers within 72 hours — declining is always fine." },
  payment_not_sent: { label: "You didn't send the payment in 72 hours", what: "You were accepted but the payment wasn't sent in time.", avoid: "Only send an offer you're ready to pay for, and pay within 72 hours of acceptance." },
  no_delivery: { label: "You didn't place the link in 72 hours", what: "A link you owed wasn't placed within 72 hours, so the deal was cancelled.", avoid: "Place your link as soon as the deal is accepted — you can place it any time within the 72 hours." },
  one_sided: { label: "One-sided delivery", what: "The other side placed their link, but you didn't place yours in time.", avoid: "Place your link within 72 hours — the other side already did their part." },
};

/* ───────────────────────── T27 · Penalty points added ───────────────────────── */

type T27 = Recipient & { reason: Reason; points: number; totalThisMonth: number; resetsOn: string; offerRef: string; domain: string };

function PenaltyAdded(p: T27 & { forceDark?: boolean }) {
  const r = reasons[p.reason];
  const left = Math.max(0, 3 - p.totalThisMonth);
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview={`+${p.points} penalty point — ${p.totalThisMonth} of 3 this month`} reason="a penalty point was added to your account">
      <Hero icon="⚖️" tone="warn" eyebrow="Penalty point" title={`+${p.points} penalty point${p.points === 1 ? "" : "s"}`} subtitle={r.label + "."} />
      <Greeting name={p.name} />
      <Panel title="This month" tag={<span style={{ fontSize: 13 }}><B>{p.totalThisMonth}</B> of 3</span>}>
        <PenaltyMeter points={p.totalThisMonth} />
        <Facts rows={[["What happened", r.what], ["Deal", `#${p.offerRef} · ${p.domain}`], ["Points reset", p.resetsOn]]} />
      </Panel>
      <Callout tone={left <= 1 ? "danger" : "warn"} title={left === 0 ? "You've reached 3 points" : `${left} more point${left === 1 ? "" : "s"} and your account is banned for 90 days`}>
        {r.avoid}
      </Callout>
      <Cta href={appUrl("/account#standing")} tone="warn">
        Trust &amp; standing
      </Cta>
    </EmailShell>
  );
}

export const t27 = defineEmail<T27>({
  id: "T27",
  name: "Penalty points added",
  group: "Penalties",
  to: "The penalised account",
  pref: "always",
  priority: "P0",
  Component: PenaltyAdded,
  subject: (p) => `+${p.points} penalty point${p.points === 1 ? "" : "s"} — ${p.totalThisMonth} of 3 this month`,
  fixtures: {
    no_response: { label: "Didn't answer an offer", props: { name: "Alex", reason: "no_response", points: 1, totalThisMonth: 1, resetsOn: "Nov 1", offerRef: "a1b2c3d4e5", domain: "northwind-tools.io" } },
    payment_not_sent: { label: "Didn't pay in time", props: { name: "Maya", reason: "payment_not_sent", points: 1, totalThisMonth: 2, resetsOn: "Nov 1", offerRef: "a1b2c3d4e5", domain: "greenleaf.blog" } },
    no_delivery: { label: "Didn't place the link", props: { name: "Alex", reason: "no_delivery", points: 1, totalThisMonth: 2, resetsOn: "Nov 1", offerRef: "a1b2c3d4e5", domain: "northwind-tools.io" } },
    one_sided: { label: "One-sided delivery", props: { name: "Alex", reason: "one_sided", points: 1, totalThisMonth: 1, resetsOn: "Nov 1", offerRef: "a1b2c3d4e5", domain: "northwind-tools.io" } },
  },
});

/* ───────────────────────── T28 · Account banned ───────────────────────── */

type T28 = Recipient & { cause: "points" | "paid"; until: string; offerRef?: string };

function Banned(p: T28 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview={`Your account is banned until ${p.until}`} reason="your account was banned">
      <Hero icon="⛔" tone="danger" eyebrow="Account banned" title={`You are banned until ${p.until}`} subtitle={p.cause === "paid" ? "A paid deal went wrong on your side. That's an immediate 90-day ban." : "You reached 3 penalty points this month."} />
      <Greeting name={p.name} />
      <PenaltyMeter points={3} />
      <Panel title="What this means">
        <Steps items={[<span key="1"><B>No new offers</B> and you can&apos;t join pools until {p.until}.</span>, "Deals already running continue as normal — keep doing your part in them.", "Your sites stay listed and other people can still send you offers.", "After 90 days your account is back to normal, with a clean slate."]} />
      </Panel>
      {p.offerRef && <P small>The ban was decided on deal #{p.offerRef}. Its page shows exactly what happened.</P>}
      <Callout tone="info" title="Think it's a mistake?">
        Reply to this email with the offer number and what you think went wrong, and we&apos;ll look at it.
      </Callout>
      <Cta href={appUrl("/account#standing")}>See your standing</Cta>
    </EmailShell>
  );
}

export const t28 = defineEmail<T28>({
  id: "T28",
  name: "Account banned for 90 days",
  group: "Penalties",
  to: "The banned account",
  pref: "always",
  priority: "P0",
  Component: Banned,
  subject: (p) => `You are banned until ${p.until}`,
  fixtures: {
    points: { label: "3 points reached", props: { name: "Alex", cause: "points", until: "Jan 10, 2027", offerRef: "a1b2c3d4e5" } },
    paid: { label: "Paid deal — 3 points at once", props: { name: "Alex", cause: "paid", until: "Jan 10, 2027", offerRef: "a1b2c3d4e5" } },
  },
});

/* ───────────────────────── T29 · Ban lifted ───────────────────────── */

type T29 = Recipient;

function BanLifted(p: T29 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview="Your ban has ended — welcome back" reason="your ban ended">
      <Hero icon="🔓" tone="success" eyebrow="Ban ended" title="Welcome back" subtitle="Your 90 days are over and your account is fully active again." />
      <Greeting name={p.name} />
      <P>You can send offers and join pools again, and your penalty points are back to zero. A few habits that keep things smooth:</P>
      <Steps items={["Answer offers within 72 hours — declining is always fine.", "Place links as soon as a deal is accepted.", "If something changes, say so on the offer instead of going quiet."]} />
      <Cta href={appUrl("/markets")}>Browse the markets</Cta>
    </EmailShell>
  );
}

export const t29 = defineEmail<T29>({
  id: "T29",
  name: "Ban lifted",
  group: "Penalties",
  to: "The account",
  pref: "always",
  priority: "P1",
  Component: BanLifted,
  subject: () => "Your ban has ended",
  fixtures: { default: { label: "Lifted", props: { name: "Alex" } } },
});

export const penaltyEmails = [t27, t28, t29];
