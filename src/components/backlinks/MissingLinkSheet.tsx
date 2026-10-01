"use client";

import { Check, CircleAlert, ExternalLink, Gavel, Link2Off } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Callout } from "@/components/shared/Callout";
import { DateTime } from "@/components/shared/DateTime";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { missingCase, type MissingCase, type MissingStep } from "@/lib/missing-links";
import { cn } from "@/lib/utils";
import type { Backlink } from "@/lib/types";

const partnerOf = (b: Backlink) => (b.direction === "given" ? b.targetDomain : b.sourceDomain);
const yourSiteOf = (b: Backlink) => (b.direction === "given" ? b.sourceDomain : b.targetDomain);

/** Colour for a missing link's badge: amber while waiting, violet once the partner is penalized, red if you were. */
export function missingBadgeClass(c: MissingCase) {
  if (c.stage === "waiting") return "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300";
  return c.remover === "partner"
    ? "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300"
    : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400";
}

/**
 * The full story of a missing link: what we found, what we did, the deadline, the penalty and
 * what you can do now. Opened from the Backlinks table and the header's Monitoring menu.
 */
export function MissingLinkSheet({
  link,
  onOpenChange,
  yours,
}: {
  link: Backlink | null;
  onOpenChange: (open: boolean) => void;
  /** The link you gave in the same deal (Exchange/ABC), so we can say where to remove it */
  yours?: Backlink;
}) {
  const c = link ? missingCase(link) : null;
  return (
    <Sheet open={link !== null && c !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
        // Keyboard users land on the first control; mouse / deep-link opens don't get a focus ring on the page link
        initialFocus={(type) => type === "keyboard"}
      >
        {link && c && <Body link={link} c={c} yours={yours} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ link, c, yours }: { link: Backlink; c: MissingCase; yours?: Backlink }) {
  const partner = partnerOf(link);
  const penalized = c.stage === "penalized";
  const Icon = penalized ? Gavel : Link2Off;

  return (
    <>
      <SheetHeader className="gap-3 border-b p-5 pr-12">
        <span className={cn("grid size-10 place-items-center rounded-full border", missingBadgeClass(c))}>
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <SheetTitle className="text-lg">
            {penalized
              ? c.remover === "partner"
                ? `${partner} was penalized`
                : "You were penalized"
              : c.remover === "partner"
                ? `${partner} removed your link`
                : "Your link is gone from your page"}
          </SheetTitle>
          <SheetDescription>{c.summary}</SheetDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SiteLabel domain={partner} className="font-medium text-foreground" />
          <MarketBadge market={link.market} icon className="h-5 px-1.5 text-[11px]" />
          <span>
            {link.direction === "received" ? "linked to" : "from"} {yourSiteOf(link)} · {link.offerId}
          </span>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-6 p-5">
        {/* What we found */}
        <div className="flex flex-col gap-1.5 rounded-xl border p-3 text-[13px]">
          <span className="text-xs text-muted-foreground">Where the link should be</span>
          <a
            href={`https://${link.sourceDomain}${link.sourcePage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-xs break-all underline-offset-2 hover:underline"
          >
            {link.sourceDomain}
            {link.sourcePage}
            <ExternalLink className="size-3 shrink-0" />
          </a>
          <span className="text-xs text-muted-foreground">
            Anchor &ldquo;{link.anchor}&rdquo; · last read <DateTime iso={link.lastScan} />
          </span>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">What happens</span>
          <ol className="flex flex-col">
            {c.steps.map((s, i) => (
              <Step key={s.label} step={s} last={i === c.steps.length - 1} />
            ))}
          </ol>
        </div>

        {/* What to do: remove your own link; the scan notices and closes the deal — nothing to confirm */}
        {c.canRemoveYours && (
          <Callout title="You don't need to keep your link">
            We warned {partner} and penalized them for not putting it back. Remove your link to them
            {yours ? (
              <>
                {" "}
                from{" "}
                <a
                  href={`https://${yours.sourceDomain}${yours.sourcePage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline underline-offset-2"
                >
                  {yours.sourceDomain}
                  {yours.sourcePage}
                </a>
              </>
            ) : null}
            . Our next daily scan sees it&apos;s gone and closes the deal on its own — no penalty for you.
          </Callout>
        )}

        {!penalized && c.remover === "partner" && (
          <Callout title="Nothing to do for now">
            We&apos;re watching the page every day. If the link comes back before {c.deadline}, this closes on its own.
          </Callout>
        )}
        {!penalized && c.remover === "you" && (
          <Callout variant="warning" title={`Put it back by ${c.deadline}`}>
            Restore the link on {link.sourceDomain}
            {link.sourcePage} with the anchor &ldquo;{link.anchor}&rdquo;. The next scan picks it up automatically.
          </Callout>
        )}
      </div>
    </>
  );
}

function Step({ step, last }: { step: MissingStep; last: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border",
            step.state === "done" && "border-foreground bg-foreground text-background",
            step.state === "current" && "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300",
            step.state === "upcoming" && "border-dashed text-muted-foreground",
          )}
        >
          {step.state === "done" ? (
            <Check className="size-3.5" />
          ) : step.state === "current" ? (
            <CircleAlert className="size-3.5" />
          ) : (
            <span className="size-1.5 rounded-full bg-current" />
          )}
        </span>
        {!last && <span className={cn("w-px flex-1", step.state === "done" ? "bg-foreground/40" : "border-l border-dashed")} />}
      </div>
      <div className={cn("flex flex-col gap-0.5", !last && "pb-4")}>
        <span className={cn("text-sm", step.state === "upcoming" ? "text-muted-foreground" : "font-medium")}>{step.label}</span>
        {step.detail && <span className="text-xs text-muted-foreground">{step.detail}</span>}
        {step.date && <span className="text-xs text-muted-foreground tabular-nums">{step.date}</span>}
      </div>
    </li>
  );
}
