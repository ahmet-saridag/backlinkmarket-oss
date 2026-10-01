import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, usd, type Deal, type Recipient } from "@/emails/types";
import { B, Callout, Cta, EmailShell, Facts, Greeting, Hero, P, Panel, SiteChip, Steps, Tag } from "@/emails/ui";

const paidDeal = (extra: Partial<Deal> = {}): Deal => ({ ref: "a1b2c3d4e5", market: "paid", yourDomain: "greenleaf.blog", otherDomain: "northwind-tools.io", url: appUrl("/offers/a1b2c3d4e5"), ...extra });

/* ───────────────────────── T09 · Buyer says they paid — proof attached ───────────────────────── */

type T09 = Recipient & { deal: Deal; amount: number; paidAt: string; reference?: string; confirmBy: string };

function PaymentClaimed(p: T09 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="payouts" preview={`${p.deal.otherDomain} says they paid ${usd(p.amount)} — check your account`} reason={`${p.deal.otherDomain} paid for your offer`}>
      <Hero icon="💸" tone="warn" eyebrow="Payment claimed" title={`${p.deal.otherDomain} says they sent ${usd(p.amount)}`} subtitle="They attached proof. Check your account, then answer." />
      <Greeting name={p.name} />
      <Panel title="The payment" tag={<Tag tone="warn">{usd(p.amount)}</Tag>}>
        <Facts rows={[["From", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Said they paid", p.paidAt], ...(p.reference ? ([["Their reference", p.reference]] as [string, React.ReactNode][]) : []), ["Proof", "Attached — open it on the offer page"]]} />
      </Panel>
      <Steps items={["Open the offer and look at their proof of payment.", "Check your account: bank, PayPal or wallet.", <span key="3"><B>Money arrived?</B> Press “I received the payment” — then you have 72 hours to place the link.</span>, <span key="4"><B>Nothing yet?</B> Press “I didn&apos;t receive it”. The offer closes, nobody is penalised, and their proof stays on record.</span>]} />
      <Callout tone="danger" title={`Answer by ${p.confirmBy}`}>
        If you don&apos;t answer within 72 hours you get 3 penalty points — a 90-day ban.
      </Callout>
      <Cta href={p.deal.url}>Open the proof</Cta>
    </EmailShell>
  );
}

export const t09 = defineEmail<T09>({
  id: "T09",
  name: "Buyer says they paid — proof attached",
  group: "Payments",
  to: "Seller",
  pref: "payouts",
  priority: "P0",
  Component: PaymentClaimed,
  subject: (p) => `${p.deal.otherDomain} says they paid ${usd(p.amount)} — please check`,
  fixtures: { default: { label: "Payment claimed", props: { name: "Alex", deal: paidDeal(), amount: 125, paidAt: "Fri, Oct 3 · 21:12", reference: "TX 8f3a…92c1", confirmBy: "Mon, Oct 6 · 21:12" } } },
});

/* ───────────────────────── T10 · Payment confirmed ───────────────────────── */

type T10 = Recipient & { deal: Deal; amount: number; placeBy: string; lines: string[] };

function PaymentConfirmed(p: T10 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="payouts" preview={`${p.deal.otherDomain} confirmed your payment — your link is next`} reason={`you paid ${p.deal.otherDomain}`}>
      <Hero icon="✅" tone="success" eyebrow="Payment confirmed" title={`${p.deal.otherDomain} received your ${usd(p.amount)}`} subtitle="They now place your link." />
      <Greeting name={p.name} />
      <Panel title="What you're getting">
        <Facts rows={p.lines.map((l, i) => [i === 0 ? "Placement" : "", l] as [string, React.ReactNode])} />
      </Panel>
      <Callout tone="info" title={`They have until ${p.placeBy}`}>
        Once they say it&apos;s placed, we open the page ourselves and check every link. You don&apos;t verify anything.
      </Callout>
      <P small>If they don&apos;t deliver in time the offer is cancelled and they are penalised.</P>
      <Cta href={p.deal.url}>View the offer</Cta>
    </EmailShell>
  );
}

export const t10 = defineEmail<T10>({
  id: "T10",
  name: "Payment confirmed",
  group: "Payments",
  to: "Buyer",
  pref: "payouts",
  priority: "P0",
  Component: PaymentConfirmed,
  subject: (p) => `${p.deal.otherDomain} confirmed your payment`,
  fixtures: { default: { label: "Confirmed", props: { name: "Maya", deal: paidDeal({ yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), amount: 125, placeBy: "Tue, Oct 7 · 09:30", lines: ["Guest post — “free SEO audit” → northwind-tools.io/seo-audit", "Link insertion — “Northwind” → northwind-tools.io/"] } } },
});

/* ───────────────────────── T11 · Seller says the payment didn't arrive ───────────────────────── */

type T11 = Recipient & { deal: Deal; amount: number };

function PaymentNotReceived(p: T11 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="payouts" preview={`${p.deal.otherDomain} says your ${usd(p.amount)} payment didn't arrive`} reason={`you told ${p.deal.otherDomain} you'd paid`}>
      <Hero icon="📭" tone="warn" eyebrow="Payment not received" title={`${p.deal.otherDomain} says it didn't arrive`} subtitle="The offer is closed." />
      <Greeting name={p.name} />
      <P>They checked their account and say the {usd(p.amount)} you sent hasn&apos;t reached them. The offer is closed. <B>Nobody is penalised</B>, and the proof you uploaded stays on record.</P>
      <Callout tone="info" title="If you did send it">
        Contact {p.deal.otherDomain} directly with your receipt — a transfer can take a day or two to land, or it may have gone to the wrong details. You can send a new offer afterwards.
      </Callout>
      <Cta href={p.deal.url}>View the offer</Cta>
    </EmailShell>
  );
}

export const t11 = defineEmail<T11>({
  id: "T11",
  name: "Seller says the payment didn't arrive",
  group: "Payments",
  to: "Buyer",
  pref: "payouts",
  priority: "P0",
  Component: PaymentNotReceived,
  subject: (p) => `${p.deal.otherDomain} says your payment didn't arrive`,
  fixtures: { default: { label: "Not received", props: { name: "Maya", deal: paidDeal({ yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), amount: 125 } } },
});

/* ───────────────────────── T12 · Payment completed (receipt) ───────────────────────── */

type T12 = Recipient & { deal: Deal; amount: number; direction: "sent" | "received"; method: string; date: string; paymentId: string };

function Receipt(p: T12 & { forceDark?: boolean }) {
  const sent = p.direction === "sent";
  return (
    <EmailShell forceDark={p.forceDark} pref="payouts" preview={`${sent ? "Payment sent" : "Payment received"} · ${usd(p.amount)} · ${p.deal.otherDomain}`} reason={`a payment on a deal of yours was completed`}>
      <Hero icon="🧾" tone="success" eyebrow={sent ? "Payment sent" : "Payment received"} title={`${usd(p.amount)} ${sent ? "to" : "from"} ${p.deal.otherDomain}`} subtitle="The link is live and verified, so this payment is now complete." />
      <Greeting name={p.name} />
      <Panel title="Receipt" tag={<Tag tone="success">Completed</Tag>}>
        <Facts rows={[["Amount", <B key="a">{usd(p.amount)}</B>], [sent ? "Paid to" : "Paid by", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Method", p.method], ["Date", p.date], ["Offer", `#${p.deal.ref}`], ["Payment ID", p.paymentId]]} />
      </Panel>
      <P small>Backlink Market never holds or moves the money — this is a record of what the two of you agreed and what was delivered.</P>
      <Cta href={appUrl("/payment-history")}>Payment history</Cta>
    </EmailShell>
  );
}

export const t12 = defineEmail<T12>({
  id: "T12",
  name: "Payment completed (receipt)",
  group: "Payments",
  to: "Buyer and seller",
  pref: "payouts",
  priority: "P2",
  Component: Receipt,
  subject: (p) => `${p.direction === "sent" ? "Payment sent" : "Payment received"} — ${usd(p.amount)} · ${p.deal.otherDomain}`,
  fixtures: {
    sent: { label: "Buyer's receipt", props: { name: "Maya", deal: paidDeal({ yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), amount: 125, direction: "sent", method: "Crypto · USDT (TRC-20)", date: "Oct 3, 2026", paymentId: "2f68c02b-d272-4f5b" } },
    received: { label: "Seller's receipt", props: { name: "Alex", deal: paidDeal(), amount: 125, direction: "received", method: "Crypto · USDT (TRC-20)", date: "Oct 3, 2026", paymentId: "99f7f718-abcb-4ba6" } },
  },
});

export const paymentEmails = [t09, t10, t11, t12];
