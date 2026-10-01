import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { GoogleButton } from "@/components/landing/public-ui";
import { SITE_DESCRIPTION } from "@/lib/app-url";

const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Markets",
    links: [
      { label: "All sites", href: "/" },
      { label: "Paid Market", href: "/?market=paid" },
      { label: "Exchange", href: "/?market=exchange" },
      { label: "ABC Pool", href: "/?market=abc" },
    ],
  },
  {
    title: "Rules",
    links: [
      { label: "Buyer rules", href: "/buyer-rules" },
      { label: "Seller rules", href: "/seller-rules" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Site map", href: "/sitemap" },
      { label: "llms.txt", href: "/llms.txt" },
      { label: "Domain Rating by Ahrefs", href: "https://ahrefs.com/", external: true },
    ],
  },
];

/** The footer of the public pages: a call to start, where everything is, and the small print. */
export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-muted/30 md:mt-24">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-4 py-12 md:px-6 md:py-16">
        {/* call to action */}
        <div className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-10">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full bg-sky-500/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex max-w-xl flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">Ready to trade links you can trust?</h2>
              <p className="text-sm text-muted-foreground md:text-base">Add a site in a minute. We check every link, every day.</p>
            </div>
            <GoogleButton label="Get started with Google" size="lg" />
          </div>
        </div>

        {/* brand + links */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 flex max-w-sm flex-col gap-4 md:col-span-1">
            <Link href="/" aria-label="Backlink Market" className="flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="text-lg tracking-tight">
                <span className="font-semibold">Backlink</span> <span className="text-muted-foreground">Market</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">{SITE_DESCRIPTION}</p>
            <a href="mailto:ahmet@boldpilot.club" className="flex w-fit items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-sm hover:bg-muted">
              <Mail className="size-4" /> Contact us
            </a>
          </div>

          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title} className="flex flex-col gap-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{c.title}</span>
              <ul className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm hover:underline">
                        {l.label} <ArrowUpRight className="size-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm hover:underline">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* small print */}
        <div className="flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {year} Backlink Market. All rights reserved.</span>
          <span>We never hold your money — you pay the seller directly.</span>
        </div>
      </div>
    </footer>
  );
}
