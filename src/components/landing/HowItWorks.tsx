import { ShowreelPlayer } from "@/components/landing/ShowreelPlayer";
import { ArrowLeftRight, BadgeCheck, Globe, ShieldCheck, Timer, Users, Wallet } from "lucide-react";

const steps = [
  { icon: Globe, title: "Add your site", text: "Tell us your domain and prove it's yours with one small file. That's all it takes." },
  { icon: ArrowLeftRight, title: "Pick how you want to trade", text: "Buy a link, swap one with another site, or join a group of three. Each one shows you the rules before you start." },
  { icon: Timer, title: "Place the link", text: "Once a deal is made, you have 72 hours. When the link goes up, we check the page ourselves." },
  { icon: ShieldCheck, title: "We keep watching", text: "We look at every link once a day. If one disappears, we tell you both and give 7 days to put it back." },
];

const markets = [
  { icon: Wallet, name: "Paid Market", text: "Buy a link on a site you like and pay its owner directly." },
  { icon: ArrowLeftRight, name: "Exchange", text: "You link to them, they link to you. No money involved." },
  { icon: Users, name: "ABC Pool", text: "Three sites, one circle: A links to B, B links to C, C links back to A." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="mt-16 flex scroll-mt-24 flex-col gap-10 md:mt-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">How it works</span>
        <h2 id="how-it-works-title" className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Links you can actually count on
        </h2>
        <p className="text-base text-muted-foreground text-balance">
          We never touch your money. We just make sure the link you were promised is really on the page, and that it stays there.
        </p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        {/* the video: a still frame here, the player opens full size */}
        <ShowreelPlayer />

        {/* the steps */}
        <ol className="flex flex-col gap-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border bg-card">
                <s.icon className="size-5" />
                <span className="absolute -top-2 -left-2 grid size-5 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">{i + 1}</span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-medium">{s.title}</span>
                <span className="text-sm text-muted-foreground">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* the three markets, one line each */}
      <div className="grid gap-3 md:grid-cols-3">
        {markets.map((m) => (
          <div key={m.name} className="flex gap-3 rounded-2xl border bg-card p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
              <m.icon className="size-4" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{m.name}</span>
              <span className="text-[13px] text-muted-foreground">{m.text}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <BadgeCheck className="size-4 text-sky-500" /> No middleman, no escrow. We check the links; we never hold the money.
      </p>
    </section>
  );
}
