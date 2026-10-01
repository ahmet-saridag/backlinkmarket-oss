import * as React from "react";
import { defineEmail } from "@/emails/define";
import { appUrl, type Recipient } from "@/emails/types";
import { B, Callout, Cta, EmailShell, Facts, Greeting, Hero, LinkFlow, P, Panel, PoolLoop, SiteChip, Stats, Tag } from "@/emails/ui";

const seats = ["greenleaf.blog", "northwind-tools.io", "acme-seo.com"];

/* ───────────────────────── T31 · Someone joined your pool ───────────────────────── */

type T31 = Recipient & { poolRef: string; joiner: { domain: string; dr: number }; filled: number; yourDomain: string };

function PoolJoined(p: T31 & { forceDark?: boolean }) {
  const left = 3 - p.filled;
  return (
    <EmailShell forceDark={p.forceDark} pref="pools" preview={`${p.joiner.domain} joined pool #${p.poolRef} — ${p.filled}/3`} reason={`you're in ABC pool #${p.poolRef}`}>
      <Hero icon="➕" tone="info" eyebrow="New member" title={`${p.joiner.domain} joined your pool`} subtitle={left > 0 ? `${p.filled} of 3 seats are taken.` : "All three seats are taken — the pool locks now."} />
      <Greeting name={p.name} />
      <Panel title={`Pool #${p.poolRef}`} tag={<Tag tone={left ? "info" : "success"}>{p.filled}/3</Tag>}>
        <Facts rows={[["New member", <SiteChip key="s" domain={p.joiner.domain} />], ["Domain Rating", `DR ${p.joiner.dr}`], ["Your site", p.yourDomain], ["Seats left", left ? String(left) : "None — locking"]]} />
      </Panel>
      <P small>{left ? "Nothing is due until all three seats are taken. When the pool locks, you'll each have 72 hours to place your link." : "You'll get the details of who links to whom in a separate email."}</P>
      <Cta href={appUrl(`/markets/abc/${p.poolRef}`)}>View the pool</Cta>
    </EmailShell>
  );
}

export const t31 = defineEmail<T31>({
  id: "T31",
  name: "Someone joined your pool",
  group: "Pools",
  to: "Pool host and members",
  pref: "pools",
  priority: "P1",
  Component: PoolJoined,
  subject: (p) => `${p.joiner.domain} joined pool #${p.poolRef}`,
  fixtures: { default: { label: "Joined — 2 of 3", props: { name: "Alex", poolRef: "7QK2M9", joiner: { domain: "northwind-tools.io", dr: 48 }, filled: 2, yourDomain: "greenleaf.blog" } } },
});

/* ───────────────────────── T32 · Pool locked — place your link ───────────────────────── */

type T32 = Recipient & { poolRef: string; seats: string[]; you: string; deadline: string; yourPage: string; yourAnchor: string };

function PoolLocked(p: T32 & { forceDark?: boolean }) {
  const i = p.seats.indexOf(p.you);
  const next = p.seats[(i + 1) % p.seats.length];
  const prev = p.seats[(i + p.seats.length - 1) % p.seats.length];
  return (
    <EmailShell forceDark={p.forceDark} pref="pools" preview={`Pool #${p.poolRef} locked — place your link for ${next} within 72 hours`} reason={`you're in ABC pool #${p.poolRef}`}>
      <Hero icon="🔒" tone="warn" eyebrow="Pool locked" title="The pool is full — place your link" subtitle="Three sites, each links to the next. Here's your part." />
      <Greeting name={p.name} />
      <PoolLoop seats={p.seats} you={p.you} />
      <LinkFlow label="You give" tone="warn" from={p.you} to={next} target={next} />
      <LinkFlow label="You get" tone="success" from={prev} to={p.you} target={p.yourPage} anchor={p.yourAnchor} />
      <Callout tone="warn" title={`Place yours by ${p.deadline}`}>
        Put a link to <B>{next}</B> on your own site, then press the button on the offer — we check it ourselves. If it isn&apos;t placed in time you get 1 penalty point and the pool is closed for everyone.
      </Callout>
      <Cta href={appUrl("/offers")} tone="warn">
        Place your link
      </Cta>
    </EmailShell>
  );
}

export const t32 = defineEmail<T32>({
  id: "T32",
  name: "Pool locked — place your link in 72 h",
  group: "Pools",
  to: "The 3 members",
  pref: "pools",
  priority: "P0",
  Component: PoolLocked,
  subject: (p) => `Pool #${p.poolRef} is locked — place your link`,
  fixtures: { default: { label: "Locked", props: { name: "Alex", poolRef: "7QK2M9", seats, you: "greenleaf.blog", deadline: "Sun, Oct 5 · 00:24", yourPage: "greenleaf.blog/", yourAnchor: "Greenleaf" } } },
});

/* ───────────────────────── T33 · A member left the pool ───────────────────────── */

type T33 = Recipient & { poolRef: string; left: string; filled: number };

function PoolLeft(p: T33 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="pools" preview={`${p.left} left pool #${p.poolRef}`} reason={`you're in ABC pool #${p.poolRef}`}>
      <Hero icon="👋" tone="neutral" eyebrow="Seat open again" title={`${p.left} left the pool`} subtitle={`${p.filled} of 3 seats are taken. The pool hasn't locked yet, so nothing is due.`} />
      <Greeting name={p.name} />
      <Stats items={[{ label: "Seats taken", value: `${p.filled}/3` }, { label: "Seats open", value: 3 - p.filled, tone: "info" }]} />
      <P small>The pool locks as soon as the third seat is filled. Until then you can stay or leave.</P>
      <Cta href={appUrl(`/markets/abc/${p.poolRef}`)}>View the pool</Cta>
    </EmailShell>
  );
}

export const t33 = defineEmail<T33>({
  id: "T33",
  name: "A member left the pool",
  group: "Pools",
  to: "Remaining members",
  pref: "pools",
  priority: "P2",
  Component: PoolLeft,
  subject: (p) => `${p.left} left pool #${p.poolRef}`,
  fixtures: { default: { label: "Left", props: { name: "Alex", poolRef: "7QK2M9", left: "acme-seo.com", filled: 1 } } },
});

/* ───────────────────────── T34 · A new open pool for your site ───────────────────────── */

type T34 = Recipient & { yourDomain: string; poolRef: string; band: string };

function NewPool(p: T34 & { forceDark?: boolean }) {
  return (
    <EmailShell forceDark={p.forceDark} pref="pools" preview={`A new open pool is ready for ${p.yourDomain}`} reason={`you host ABC pools for ${p.yourDomain}`}>
      <Hero icon="🆕" tone="info" eyebrow="Pool opened" title="A new pool is waiting for members" subtitle={`Your last pool locked, so we opened another one for ${p.yourDomain}.`} />
      <Greeting name={p.name} />
      <Panel title={`Pool #${p.poolRef}`} tag={<Tag tone="info">1/3</Tag>}>
        <Facts rows={[["Your site", <SiteChip key="s" domain={p.yourDomain} />], ["Domain Rating band", p.band], ["Seats", "1 of 3 taken (yours)"]]} />
      </Panel>
      <P small>It follows the same DR and traffic rules you set for your site. You can change them under My Sites.</P>
      <Cta href={appUrl(`/markets/abc/${p.poolRef}`)}>View the pool</Cta>
    </EmailShell>
  );
}

export const t34 = defineEmail<T34>({
  id: "T34",
  name: "A new open pool for your site",
  group: "Pools",
  to: "Pool host",
  pref: "pools",
  priority: "P2",
  Component: NewPool,
  subject: (p) => `A new pool is open for ${p.yourDomain}`,
  fixtures: { default: { label: "New pool", props: { name: "Alex", yourDomain: "greenleaf.blog", poolRef: "9XQ4TD", band: "DR 20–40" } } },
});

export const poolEmails = [t31, t32, t33, t34];
