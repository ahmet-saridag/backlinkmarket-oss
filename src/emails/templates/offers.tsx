import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, marketNames, usd, type Deal, type LinkSpec, type Market, type Recipient } from "@/emails/types";
import { B, Callout, Countdown, Cta, EmailShell, Facts, Greeting, Hero, LinkFlow, P, Panel, Quote, SiteChip, Steps, Tag } from "@/emails/ui";

const deal = (market: Market, extra: Partial<Deal> = {}): Deal => ({
  ref: "a1b2c3d4e5",
  market,
  yourDomain: "greenleaf.blog",
  otherDomain: "northwind-tools.io",
  url: appUrl("/offers/a1b2c3d4e5"),
  ...extra,
});

/* ───────────────────────── T01 · Offer / swap proposal received ───────────────────────── */

type T01 = Recipient & {
  deal: Deal;
  sender: { domain: string; owner: string; dr: number; traffic: string };
  respondBy: string;
  /** Paid */
  lines?: { category: string; target: string; anchor: string; price: number }[];
  total?: number;
  /** Exchange */
  youGet?: LinkSpec;
  youGive?: LinkSpec;
  message?: string;
};

function OfferReceived(p: T01 & { forceDark?: boolean }) {
  const paid = p.deal.market === "paid";
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={paid ? `${p.sender.domain} offers ${usd(p.total ?? 0)} for a link on ${p.deal.yourDomain}` : `${p.sender.domain} proposes a link swap`} reason={`someone sent an offer to ${p.deal.yourDomain}`}>
      <Hero icon={paid ? "📩" : "🔁"} eyebrow={paid ? "New offer" : "Swap proposal"} title={paid ? `${p.sender.domain} wants to buy a link on ${p.deal.yourDomain}` : `${p.sender.domain} wants to swap links with ${p.deal.yourDomain}`} subtitle={paid ? "They pay you directly once you accept." : "One link each way. Nothing is paid."} />
      <Greeting name={p.name} />
      <Panel title="From" tag={<Tag tone="info">{marketNames[p.deal.market]}</Tag>}>
        <SiteChip domain={p.sender.domain} />
        <Facts rows={[["Owner", p.sender.owner], ["Domain Rating", `DR ${p.sender.dr}`], ["Organic traffic", `${p.sender.traffic} / month`]]} />
      </Panel>
      {paid && p.lines && (
        <Panel title="What they ordered" tag={<Tag tone="success">{usd(p.total ?? 0)}</Tag>}>
          <Facts rows={p.lines.flatMap((l) => [[l.category, <span key={l.anchor}>“{l.anchor}” → <B>{l.target}</B> · {usd(l.price)}</span>] as [string, React.ReactNode]])} />
        </Panel>
      )}
      {!paid && p.youGet && <LinkFlow label="You get" tone="success" {...p.youGet} />}
      {!paid && p.youGive && <LinkFlow label="You give" tone="warn" {...p.youGive} />}
      {p.message && <Quote from={p.sender.owner}>{p.message}</Quote>}
      <Callout tone="warn" title={`Answer by ${p.respondBy}`}>
        You have 72 hours. After that the offer expires and counts as no response (1 penalty point).
      </Callout>
      <Cta href={p.deal.url} secondary={{ href: p.deal.url, label: "Decline" }}>
        Review and answer
      </Cta>
    </EmailShell>
  );
}

export const t01 = defineEmail<T01>({
  id: "T01",
  name: "Offer / swap proposal received",
  group: "Offers",
  to: "Seller / recipient",
  pref: "offers",
  priority: "P0",
  Component: OfferReceived,
  subject: (p) => (p.deal.market === "paid" ? `New offer for ${p.deal.yourDomain} — ${usd(p.total ?? 0)}` : `${p.sender.domain} wants to swap links with ${p.deal.yourDomain}`),
  fixtures: {
    paid: {
      label: "Paid offer",
      props: {
        name: "Alex",
        deal: deal("paid"),
        sender: { domain: "northwind-tools.io", owner: "Maya Collins", dr: 48, traffic: "12k" },
        lines: [
          { category: "Guest post", target: "northwind-tools.io/seo-audit", anchor: "free SEO audit", price: 90 },
          { category: "Link insertion", target: "northwind-tools.io/", anchor: "Northwind", price: 35 },
        ],
        total: 125,
        respondBy: "Sat, Oct 4 · 21:40",
      },
    },
    exchange: {
      label: "Swap proposal",
      props: {
        name: "Alex",
        deal: deal("exchange"),
        sender: { domain: "northwind-tools.io", owner: "Maya Collins", dr: 48, traffic: "12k" },
        youGet: { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/", anchor: "Northwind tools" },
        youGive: { from: "northwind-tools.io", to: "greenleaf.blog", page: "northwind-tools.io/blog/outdoor-gear", target: "greenleaf.blog/", anchor: "Greenleaf" },
        message: "Hi! Our audiences overlap — happy to adjust the pages or anchors.",
        respondBy: "Sat, Oct 4 · 21:40",
      },
    },
  },
});

/* ───────────────────────── T02 · Offer sent (confirmation) ───────────────────────── */

type T02 = Recipient & { deal: Deal; total?: number; answerBy: string };

function OfferSent(p: T02 & { forceDark?: boolean }) {
  const paid = p.deal.market === "paid";
  return (
    <EmailShell forceDark={p.forceDark} pref="always" preview={`Your ${paid ? "offer" : "swap proposal"} to ${p.deal.otherDomain} is on its way`} reason={`you sent ${paid ? "an offer" : "a swap proposal"} to ${p.deal.otherDomain}`}>
      <Hero icon="✈️" eyebrow={paid ? "Offer sent" : "Proposal sent"} title={`Sent to ${p.deal.otherDomain}`} subtitle="Here's what happens next." />
      <Greeting name={p.name} />
      <Panel title="Your offer" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[["To", <SiteChip key="s" domain={p.deal.otherDomain} />], ["For your site", p.deal.yourDomain], ...(paid ? ([["Total", usd(p.total ?? 0)]] as [string, React.ReactNode][]) : [])]} />
      </Panel>
      <Steps items={[<span key="1"><B>{p.deal.otherDomain}</B> has 72 hours to answer (until {p.answerBy}).</span>, paid ? "If they accept, you pay them directly and upload your proof of payment." : "If they accept, you both place a link within 72 hours.", "You can cancel while it's unanswered, once the first hour has passed."]} />
      <Cta href={p.deal.url}>View your offer</Cta>
    </EmailShell>
  );
}

export const t02 = defineEmail<T02>({
  id: "T02",
  name: "Offer sent (confirmation)",
  group: "Offers",
  to: "Buyer / proposer",
  pref: "always",
  priority: "P2",
  Component: OfferSent,
  subject: (p) => `Your ${p.deal.market === "paid" ? "offer" : "swap proposal"} to ${p.deal.otherDomain} was sent`,
  fixtures: {
    paid: { label: "Paid", props: { name: "Maya", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), total: 125, answerBy: "Sat, Oct 4 · 21:40" } },
    exchange: { label: "Exchange", props: { name: "Maya", deal: deal("exchange", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), answerBy: "Sat, Oct 4 · 21:40" } },
  },
});

/* ───────────────────────── T03 · Offer accepted ───────────────────────── */

type T03 = Recipient & {
  deal: Deal;
  total?: number;
  payoutMethod?: string;
  deadline: string;
  youPlace?: LinkSpec;
  theyPlace?: LinkSpec;
};

function OfferAccepted(p: T03 & { forceDark?: boolean }) {
  const paid = p.deal.market === "paid";
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={paid ? `${p.deal.otherDomain} accepted — pay and upload your proof` : `${p.deal.otherDomain} accepted your swap — place your link`} reason={`you sent an offer to ${p.deal.otherDomain}`}>
      <Hero icon="🎉" tone="success" eyebrow="Accepted" title={`${p.deal.otherDomain} said yes`} subtitle={paid ? "Now it's your move: pay them directly and show your proof." : "Both of you now place a link — within 72 hours."} />
      <Greeting name={p.name} />
      {paid ? (
        <>
          <Panel title="Payment" tag={<Tag tone="success">{usd(p.total ?? 0)}</Tag>}>
            <Facts rows={[["Pay to", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Method", p.payoutMethod ?? "—"], ["Send by", p.deadline]]} />
          </Panel>
          <Steps items={["Open the offer and copy their payout details exactly.", "Send the money using that method only.", <span key="3"><B>Upload your proof</B> — a bank receipt, IBAN confirmation or transaction screenshot — and press “I&apos;ve sent the payment”.</span>, "They confirm it arrived, then place your link within 72 hours."]} />
          <Callout tone="warn" title="Backlink Market never holds your money">
            Pay only to the details on the offer page. If the payment isn&apos;t sent by {p.deadline} the offer is cancelled and you get 1 penalty point.
          </Callout>
        </>
      ) : (
        <>
          {p.youPlace && <LinkFlow label="You place" tone="warn" {...p.youPlace} />}
          {p.theyPlace && <LinkFlow label="They place" tone="success" {...p.theyPlace} />}
          <Callout tone="warn" title={`Place yours by ${p.deadline}`}>
            If a link isn&apos;t placed in time the swap is cancelled for both sides and the late one gets a penalty point.
          </Callout>
        </>
      )}
      <Cta href={p.deal.url} tone={paid ? "success" : "neutral"}>
        {paid ? "Pay and upload proof" : "Place your link"}
      </Cta>
    </EmailShell>
  );
}

export const t03 = defineEmail<T03>({
  id: "T03",
  name: "Offer accepted",
  group: "Offers",
  to: "Buyer / proposer",
  pref: "offers",
  priority: "P0",
  Component: OfferAccepted,
  subject: (p) => `${p.deal.otherDomain} accepted your ${p.deal.market === "paid" ? "offer" : "swap"}`,
  fixtures: {
    paid: { label: "Paid — pay & upload proof", props: { name: "Maya", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), total: 125, payoutMethod: "Crypto · USDT (TRC-20)", deadline: "Sun, Oct 5 · 00:24" } },
    exchange: {
      label: "Exchange — both place",
      props: {
        name: "Maya",
        deal: deal("exchange", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }),
        deadline: "Sun, Oct 5 · 00:24",
        youPlace: { from: "northwind-tools.io", to: "greenleaf.blog", page: "northwind-tools.io/blog/outdoor-gear", target: "greenleaf.blog/", anchor: "Greenleaf" },
        theyPlace: { from: "greenleaf.blog", to: "northwind-tools.io", page: "greenleaf.blog/best-hiking-boots", target: "northwind-tools.io/", anchor: "Northwind tools" },
      },
    },
  },
});

/* ───────────────────────── T04 · Offer declined ───────────────────────── */

type T04 = Recipient & { deal: Deal };

function OfferDeclined(p: T04 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={`${p.deal.otherDomain} declined your ${p.deal.market === "paid" ? "offer" : "swap"}`} reason={`you sent an offer to ${p.deal.otherDomain}`}>
      <Hero icon="🙅" tone="neutral" eyebrow="Declined" title={`${p.deal.otherDomain} passed on this one`} subtitle="Nothing was paid and nothing is owed." />
      <Greeting name={p.name} />
      <P>Not every match fits — their rules, their calendar, their niche. It doesn&apos;t count against you.</P>
      <Panel title="Offer" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[["To", <SiteChip key="s" domain={p.deal.otherDomain} />], ["For your site", p.deal.yourDomain], ["Status", "Declined"]]} />
      </Panel>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>Find another site</Cta>
    </EmailShell>
  );
}

export const t04 = defineEmail<T04>({
  id: "T04",
  name: "Offer declined",
  group: "Offers",
  to: "Buyer / proposer",
  pref: "offers",
  priority: "P0",
  Component: OfferDeclined,
  subject: (p) => `${p.deal.otherDomain} declined your ${p.deal.market === "paid" ? "offer" : "swap proposal"}`,
  fixtures: { default: { label: "Declined", props: { name: "Maya", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }) } } },
});

/* ───────────────────────── T05 · Offer cancelled by the sender ───────────────────────── */

type T05 = Recipient & { deal: Deal };

function OfferCancelled(p: T05 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={`${p.deal.otherDomain} withdrew their offer before you answered`} reason={`${p.deal.otherDomain} had sent you an offer`}>
      <Hero icon="↩️" tone="neutral" eyebrow="Offer withdrawn" title={`${p.deal.otherDomain} cancelled their offer`} subtitle="They changed their mind before you answered." />
      <Greeting name={p.name} />
      <P>There&apos;s nothing to do and nothing is owed. If you were about to accept, no harm done — the offer is closed.</P>
      <Panel title="Offer" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[["From", <SiteChip key="s" domain={p.deal.otherDomain} />], ["For your site", p.deal.yourDomain], ["Status", "Cancelled by the sender"]]} />
      </Panel>
      <Cta href={appUrl("/offers")}>Back to your offers</Cta>
    </EmailShell>
  );
}

export const t05 = defineEmail<T05>({
  id: "T05",
  name: "Offer cancelled by the sender",
  group: "Offers",
  to: "Seller / recipient",
  pref: "offers",
  priority: "P1",
  Component: OfferCancelled,
  subject: (p) => `${p.deal.otherDomain} cancelled their offer`,
  fixtures: { default: { label: "Cancelled", props: { name: "Alex", deal: deal("paid") } } },
});

/* ───────────────────────── T06 · Offer expired ───────────────────────── */

type T06 = Recipient & { deal: Deal };

function OfferExpired(p: T06 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={`${p.deal.otherDomain} didn't answer in 72 hours — your offer expired`} reason={`you sent an offer to ${p.deal.otherDomain}`}>
      <Hero icon="⌛" tone="warn" eyebrow="Expired" title={`No answer from ${p.deal.otherDomain}`} subtitle="72 hours passed, so the offer closed by itself." />
      <Greeting name={p.name} />
      <P>Nothing was paid and nothing is owed. You can send the same offer again or look at other sites that fit.</P>
      <Panel title="Offer" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[["To", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Status", "Expired — no answer in 72 hours"]]} />
      </Panel>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>Find another site</Cta>
    </EmailShell>
  );
}

export const t06 = defineEmail<T06>({
  id: "T06",
  name: "Offer expired (no answer in 72 h)",
  group: "Offers",
  to: "Buyer / proposer",
  pref: "offers",
  priority: "P0",
  Component: OfferExpired,
  subject: (p) => `Your offer to ${p.deal.otherDomain} expired`,
  fixtures: { default: { label: "Expired", props: { name: "Maya", deal: deal("exchange", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }) } } },
});

/* ───────────────────────── T07 · Withdrawn after acceptance ───────────────────────── */

type T07 = Recipient & { deal: Deal; reason: string };

function Withdrawn(p: T07 & { forceDark?: boolean }) {
  const paid = p.deal.market === "paid";
  return (
    <EmailShell forceDark={p.forceDark} pref="offers" preview={`${p.deal.otherDomain} withdrew from the ${paid ? "offer" : "swap"}`} reason={`${p.deal.otherDomain} withdrew from a deal with you`}>
      <Hero icon="↩️" tone="warn" eyebrow={paid ? "Offer withdrawn" : "Swap withdrawn"} title={`${p.deal.otherDomain} pulled out`} subtitle="They backed out after accepting." />
      <Greeting name={p.name} />
      <Callout tone="neutral" title="Their reason">
        {p.reason}
      </Callout>
      <P>{paid ? "Nothing was paid, so nothing is owed — they hadn't said they'd paid." : "Nothing had been placed on either site, so there's nothing to take down."} The deal is closed for both of you.</P>
      <Panel title="Deal" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[["With", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Your site", p.deal.yourDomain], ["Status", "Withdrawn"]]} />
      </Panel>
      <Cta href={appUrl(`/markets/${p.deal.market}`)}>Find another match</Cta>
    </EmailShell>
  );
}

export const t07 = defineEmail<T07>({
  id: "T07",
  name: "Withdrawn after acceptance",
  group: "Offers",
  to: "The other side",
  pref: "offers",
  priority: "P0",
  Component: Withdrawn,
  subject: (p) => `${p.deal.otherDomain} withdrew from the ${p.deal.market === "paid" ? "offer" : "swap"}`,
  fixtures: {
    paid: { label: "Paid — buyer withdrew", props: { name: "Alex", deal: deal("paid"), reason: "I can't pay this way." } },
    exchange: { label: "Exchange — either side", props: { name: "Alex", deal: deal("exchange"), reason: "My site is being redesigned." } },
  },
});

/* ───────────────────────── T08 · Deadline reminder, 24 h left ───────────────────────── */

type Step = "respond" | "pay" | "confirm" | "place_paid" | "place_swap";
type T08 = Recipient & { deal: Deal; step: Step; deadline: string };

const reminder: Record<Step, { title: string; sub: string; tone: "warn" | "danger"; consequence: string; cta: string; icon: string }> = {
  respond: { icon: "⏰", title: "An offer is waiting for your answer", sub: "Accept or decline before it expires.", tone: "warn", consequence: "After the deadline the offer expires and you get 1 penalty point for not answering.", cta: "Answer the offer" },
  pay: { icon: "⏰", title: "Your payment is due", sub: "Send it and upload your proof.", tone: "warn", consequence: "If it isn't sent in time the offer is cancelled and you get 1 penalty point.", cta: "Pay and upload proof" },
  confirm: { icon: "🚨", title: "Confirm the payment — or tell us it didn't arrive", sub: "The buyer says they paid and attached their proof.", tone: "danger", consequence: "If you do nothing, you get 3 penalty points — which means a 90-day ban.", cta: "Open the proof" },
  place_paid: { icon: "🚨", title: "Place the link you were paid for", sub: "The payment is confirmed; the buyer is waiting.", tone: "danger", consequence: "If the link isn't placed in time you get 3 penalty points — a 90-day ban — and the offer is cancelled.", cta: "Place the link" },
  place_swap: { icon: "⏰", title: "Place your link", sub: "The other side is counting on it.", tone: "warn", consequence: "If it isn't placed in time you get 1 penalty point and the swap / pool is cancelled for everyone.", cta: "Place the link" },
};

function DeadlineReminder(p: T08 & { forceDark?: boolean }) {
  const r = reminder[p.step];
  return (
    <EmailShell forceDark={p.forceDark} pref="deadlines" preview={`24 hours left — ${r.title.toLowerCase()}`} reason={`you have a step due on a ${marketNames[p.deal.market]} deal`}>
      <Hero icon={r.icon} tone={r.tone} eyebrow="24 hours left" title={r.title} subtitle={r.sub} />
      <Greeting name={p.name} />
      <Countdown value="24 h" label={`Due ${p.deadline}`} tone={r.tone} />
      <Panel title="Deal" tag={<Tag>{marketNames[p.deal.market]} · #{p.deal.ref}</Tag>}>
        <Facts rows={[["With", <SiteChip key="s" domain={p.deal.otherDomain} />], ["Your site", p.deal.yourDomain]]} />
      </Panel>
      <Callout tone={r.tone} title="What happens if it's missed">
        {r.consequence}
      </Callout>
      <Cta href={p.deal.url} tone={r.tone === "danger" ? "danger" : "warn"}>
        {r.cta}
      </Cta>
    </EmailShell>
  );
}

export const t08 = defineEmail<T08>({
  id: "T08",
  name: "Deadline reminder — 24 hours left",
  group: "Offers",
  to: "Whoever owes the step",
  pref: "deadlines",
  priority: "P0",
  Component: DeadlineReminder,
  subject: (p) => `24 hours left: ${reminder[p.step].title.toLowerCase()}`,
  fixtures: {
    respond: { label: "Respond to an offer", props: { name: "Alex", deal: deal("paid"), step: "respond", deadline: "Sat, Oct 4 · 21:40" } },
    pay: { label: "Pay (buyer)", props: { name: "Maya", deal: deal("paid", { yourDomain: "northwind-tools.io", otherDomain: "greenleaf.blog" }), step: "pay", deadline: "Sun, Oct 5 · 00:24" } },
    confirm: { label: "Confirm the payment (seller)", props: { name: "Alex", deal: deal("paid"), step: "confirm", deadline: "Sun, Oct 5 · 00:24" } },
    place_paid: { label: "Place the link — Paid (seller)", props: { name: "Alex", deal: deal("paid"), step: "place_paid", deadline: "Sun, Oct 5 · 00:24" } },
    place_swap: { label: "Place the link — Exchange / ABC", props: { name: "Alex", deal: deal("exchange"), step: "place_swap", deadline: "Sun, Oct 5 · 00:24" } },
  },
});

export const offerEmails = [t01, t02, t03, t04, t05, t06, t07, t08];
