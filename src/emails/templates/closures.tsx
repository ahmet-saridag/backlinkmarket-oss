import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, marketNames, type Deal, type Market, type Recipient } from "@/emails/types";
import { B, Callout, Cta, EmailShell, Facts, Greeting, Hero, P, Panel, SiteChip, Tag } from "@/emails/ui";

type Kind = "buyer_no_pay" | "seller_no_confirm" | "seller_no_delivery" | "swap_partner" | "pool";

type T19 = Recipient & { kind: Kind; deal: Deal; /** The link was already up when this closed */ delivered?: boolean };

const deal = (market: Market): Deal => ({ ref: "a1b2c3d4e5", market, yourDomain: "greenleaf.blog", otherDomain: "northwind-tools.io", url: appUrl("/offers/a1b2c3d4e5") });

const copy: Record<Kind, { title: (p: T19) => string; sub: string; why: (p: T19) => string; tone: "warn" | "neutral" }> = {
  buyer_no_pay: {
    title: (p) => `${p.deal.otherDomain} didn't pay in time`,
    sub: "The 72 hours for the payment ran out, so the offer was closed.",
    why: (p) => `${p.deal.otherDomain} didn't send the payment within 72 hours of your accepting their offer. They received 1 penalty point.`,
    tone: "neutral",
  },
  seller_no_confirm: {
    title: (p) => `${p.deal.otherDomain} didn't answer your payment`,
    sub: "They had 72 hours to confirm it and didn't.",
    why: (p) => `You said you paid, but ${p.deal.otherDomain} neither confirmed nor said it hadn't arrived. The offer is closed and they were penalised.`,
    tone: "warn",
  },
  seller_no_delivery: {
    title: (p) => `${p.deal.otherDomain} didn't place your link`,
    sub: "They confirmed your payment but ran out of time.",
    why: (p) => `${p.deal.otherDomain} didn't place the link within 72 hours of confirming your payment, so the offer is closed and they were penalised. Since Backlink Market never holds the money, ask them directly to return your payment.`,
    tone: "warn",
  },
  swap_partner: {
    title: (p) => `${p.deal.otherDomain} didn't place their link`,
    sub: "The swap was cancelled.",
    why: () => "The other side didn't place their link within 72 hours, so the swap was cancelled and they were penalised.",
    tone: "warn",
  },
  pool: {
    title: () => "The pool was closed",
    sub: "A member didn't place their link in time.",
    why: () => "A member of the pool didn't place their link within 72 hours, so the pool was closed for everyone and they were penalised. You are not penalised.",
    tone: "warn",
  },
};

function ClosedByTimeout(p: T19 & { forceDark?: boolean }) {
  const c = copy[p.kind];
  const swapOrPool = p.kind === "swap_partner" || p.kind === "pool";
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={c.title(p)} reason={`a ${marketNames[p.deal.market]} deal of yours was closed because the other side ran out of time`}>
      <Hero icon="⏱️" tone={c.tone} eyebrow="Closed — nothing wrong on your side" title={c.title(p)} subtitle={c.sub} />
      <Greeting name={p.name} />
      <P>{p.kind === "buyer_no_pay" ? `${p.deal.otherDomain} didn't send the payment within 72 hours of your accepting their offer, so the offer was closed. They received 1 penalty point.` : c.why(p)}</P>
      {swapOrPool && (p.delivered ? (
        <Callout tone="info" title="You can take your link down">
          You already placed yours. Because the deal is cancelled, you&apos;re free to remove it — we&apos;ve stopped checking it, so removing it won&apos;t count against you.
        </Callout>
      ) : (
        <Callout tone="info" title="Nothing more is due from you">
          You hadn&apos;t placed your link yet, and you no longer need to.
        </Callout>
      ))}
      <Panel title="Deal" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[p.kind === "pool" ? ["Pool", "Closed"] : ["With", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Your site", p.deal.yourDomain], ["Status", "Cancelled"]]} />
      </Panel>
      <P small>It doesn&apos;t count against you. <B>Find another match</B> whenever you&apos;re ready.</P>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>Find another match</Cta>
    </EmailShell>
  );
}

export const t19 = defineEmail<T19>({
  id: "T19",
  name: "Closed because the other side ran out of time",
  group: "Closures",
  to: "The side that is not penalised",
  pref: "offers",
  priority: "P0",
  Component: ClosedByTimeout,
  subject: (p) => copy[p.kind].title(p),
  fixtures: {
    buyer_no_pay: { label: "Paid — buyer didn't pay (to seller)", props: { name: "Alex", kind: "buyer_no_pay", deal: deal("paid") } },
    seller_no_confirm: { label: "Paid — seller didn't confirm (to buyer)", props: { name: "Maya", kind: "seller_no_confirm", deal: deal("paid") } },
    seller_no_delivery: { label: "Paid — seller didn't deliver (to buyer)", props: { name: "Maya", kind: "seller_no_delivery", deal: deal("paid") } },
    swap_delivered: { label: "Swap — partner failed, your link is up", props: { name: "Alex", kind: "swap_partner", delivered: true, deal: deal("exchange") } },
    swap_waiting: { label: "Swap — partner failed, you hadn't placed", props: { name: "Alex", kind: "swap_partner", delivered: false, deal: deal("exchange") } },
    pool_delivered: { label: "Pool — a member failed, your link is up", props: { name: "Alex", kind: "pool", delivered: true, deal: deal("abc") } },
    pool_waiting: { label: "Pool — a member failed, you hadn't placed", props: { name: "Alex", kind: "pool", delivered: false, deal: deal("abc") } },
  },
});

export const closureEmails = [t19];
