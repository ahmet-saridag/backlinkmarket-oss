"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, CircleX, Loader2, X } from "lucide-react";
import { checkSitemapForDomain } from "@/app/(app)/sites/new/actions";
import { sendExchangeOffer } from "@/app/(app)/offers/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/shared/Callout";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Field } from "@/components/shared/Field";
import { SitemapSearch } from "@/components/shared/SitemapSearch";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { useIsSuspended } from "@/components/standing/standing";
import { periodLabels } from "@/lib/labels";
import { displayTraffic } from "@/lib/traffic-ranges";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { MarketSite, UserSite } from "@/lib/types";

const inRange = (dr: number, traffic: number, [drMin, drMax]: [number, number], [tMin, tMax]: [number, number | null]) =>
  dr >= drMin && dr <= drMax && traffic >= tMin && (tMax === null || traffic <= tMax);

const norm = (u: string) => u.trim().replace(/\/$/, "").toLowerCase();

/** A numbered section of the proposal. */
function Section({ n, title, description, children }: { n: number; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">{n}</span>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

/** Pick a page of a site: from its sitemap when there is one, or type the address. */
function PagePicker({ label, hint, domain, pages, loading, value, onChange, error }: {
  label: string;
  hint?: string;
  domain: string;
  pages: string[];
  loading?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [browsing, setBrowsing] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`https://${domain}/…`} aria-invalid={!!error} className="font-mono text-[13px]" />
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Reading the sitemap of {domain}…
        </p>
      ) : pages.length > 0 ? (
        <>
          <button type="button" onClick={() => setBrowsing((v) => !v)} className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {browsing ? "Hide pages" : `Choose from ${pages.length.toLocaleString("en-US")} pages`}
          </button>
          {browsing && <SitemapSearch pages={pages} selected={value ? [value] : []} onToggle={(p) => { onChange(value === p ? "" : p); setBrowsing(false); }} placeholder={`Search the pages of ${domain}…`} />}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No sitemap found for {domain} — type the page address.</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </Field>
  );
}

function Check2({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2 text-sm", ok ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300")}>
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleX className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </li>
  );
}

/**
 * A link swap, explained and built step by step: pick your site, pick where each of the two links goes (from the
 * sitemaps, or the other side's listed pages), write the anchors, add a note, check it, send it.
 */
export function ExchangeOfferForm({ site, mySites, theirPages }: { site: MarketSite; mySites: UserSite[]; theirPages: string[] }) {
  const router = useRouter();
  const suspended = useIsSuspended();
  const [pending, startTransition] = useTransition();
  const [mineId, setMineId] = useState<string | null>(mySites.length === 1 ? mySites[0].id : null);
  const mine = mySites.find((s) => s.id === mineId) ?? null;

  // Links you get: hosted by them, pointing to you
  const [hostPage, setHostPage] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [anchor, setAnchor] = useState("");
  // Links you give: hosted by you, pointing to them
  const giveHostPage = "";
  const [giveTargetUrl] = useState(`https://${site.domain}/`);
  const [giveAnchor] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  // Your own sitemap, read once you've picked the site
  const [myPagesFor, setMyPagesFor] = useState<{ domain: string; pages: string[] } | null>(null);
  useEffect(() => {
    if (!mine) return;
    let stale = false;
    const domain = mine.domain;
    checkSitemapForDomain(domain)
      .then((r) => !stale && setMyPagesFor({ domain, pages: r.pages }))
      .catch(() => !stale && setMyPagesFor({ domain, pages: [] }));
    return () => {
      stale = true;
    };
  }, [mine]);
  const myPagesLoading = !!mine && myPagesFor?.domain !== mine.domain;
  const myPages = mine && myPagesFor?.domain === mine.domain ? myPagesFor.pages : [];

  const pickSite = (id: string) => {
    setMineId(id);
    const s = mySites.find((x) => x.id === id);
    if (s) {
      setTargetUrl((v) => v || `https://${s.domain}/`);
    }
  };

  if (mySites.length === 0) {
    return (
      <Callout variant="warning" title="You need a site in Exchange">
        A swap needs a link from your own site. Open one of your sites to Exchange in My Sites first.
      </Callout>
    );
  }

  const slots = site.specifyPages ? site.exchangeSlots : [];
  const slotsOnly = slots.length > 0 && !site.generalCapacity;
  const theyAcceptYou = mine ? inRange(mine.dr, mine.traffic, site.acceptedDr, site.acceptedTraffic) : true;
  const youAcceptThem = mine
    ? inRange(site.dr, site.traffic, [mine.exchangeTerms?.drMin ?? 0, mine.exchangeTerms?.drMax ?? 100], [mine.exchangeTerms?.trafficMin ?? 0, mine.exchangeTerms?.trafficMax ?? null])
    : true;
  const complete = !!mine && [targetUrl, anchor].every((v) => v.trim()) && (!slotsOnly || !!hostPage.trim());

  const submit = () =>
    startTransition(async () => {
      setErrors({});
      const result = await sendExchangeOffer({ buyerSiteId: mine!.id, sellerSiteId: site.id, hostPage: hostPage.trim(), targetUrl, anchor, giveHostPage: giveHostPage.trim(), giveTargetUrl: site.wantedPage || giveTargetUrl || `https://${site.domain}/`, giveAnchor: site.wantedAnchor || giveAnchor.trim() || site.domain, message: message.trim() || undefined });
      if (result.ok) {
        toast.success("Swap proposed");
        router.push(`/offers/${result.offerRef}`);
        return;
      }
      setConfirming(false);
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Something went wrong.");
    });


  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        A swap is one link each way: {site.domain} links to your site and you link to theirs. Nothing is paid. Both sides place their link within 72 hours and we check it.
      </p>

      {/* 2. the swap */}
      <Section n={1} title="The swap" description={`You get a link from ${site.domain}, and you give one from ${mine?.domain ?? "your site"} back.`}>
        <div className="grid gap-2 sm:grid-cols-2">
          {mySites.map((s) => {
            const on = s.id === mineId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSite(s.id)}
                aria-pressed={on}
                className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition-colors", on ? "border-foreground bg-foreground/[0.04] ring-1 ring-foreground/20" : "hover:border-foreground/30")}
              >
                <SiteLabel domain={s.domain} size={24} className="flex-1 font-medium" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  DR {s.dr} · {displayTraffic(s.traffic)}
                </span>
                {on && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        {mine && (
          <ul className="flex flex-col gap-1.5">
            {!theyAcceptYou && <Check2 ok={false}>
              {site.domain} accepts {mine.domain}: your DR {mine.dr} and traffic {displayTraffic(mine.traffic)} {theyAcceptYou ? "are inside" : "are outside"} what they take (DR {site.acceptedDr[0]}–{site.acceptedDr[1]}).
            </Check2>}
            {!youAcceptThem && <Check2 ok={false}>
              {mine.domain} accepts {site.domain}: their DR {site.dr} and traffic {displayTraffic(site.traffic)} {youAcceptThem ? "are inside" : "are outside"} what you take.{" "}
              {!youAcceptThem && (
                <Link href={`/sites/${mine.domain}/edit`} className="underline underline-offset-2">
                  Change your range
                </Link>
              )}
            </Check2>}
          </ul>
        )}
        {slotsOnly ? (
          <Field label="Page the link sits on" hint={`${site.domain} only places links on these pages.`}>
            <ul className="flex flex-col gap-2">
              {slots.map((slot) => {
                const on = norm(slot.page) === norm(hostPage);
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      onClick={() => setHostPage(slot.page)}
                      className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left", on ? "border-foreground bg-foreground/[0.04]" : "hover:border-foreground/30")}
                    >
                      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", on && "border-foreground bg-foreground text-background")}>{on && <Check className="size-3" />}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-mono text-[13px] break-all">{slot.page}</span>
                        <span className="text-xs text-muted-foreground">
                          Up to {slot.maxLinks} link{slot.maxLinks > 1 ? "s" : ""} {periodLabels[slot.period].toLowerCase()}
                          {slot.note ? ` · ${slot.note}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {errors.hostPage && <p className="text-xs text-destructive">{errors.hostPage}</p>}
          </Field>
        ) : (
          <PagePicker label={`Which page of ${site.domain} should carry your link?`} hint="Optional — leave empty for any page." domain={site.domain} pages={theirPages} value={hostPage} onChange={setHostPage} error={errors.hostPage} />
        )}
        <PagePicker label="Which page of yours should it point to?" domain={mine?.domain ?? "your site"} pages={myPages} loading={myPagesLoading} value={targetUrl} onChange={setTargetUrl} error={errors.targetUrl} />
        <Field label="Anchor text you want">
          <Input value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder="e.g. technical SEO checklist" aria-invalid={!!errors.anchor} />
        </Field>
        <div className="rounded-xl border bg-muted/30 p-3 text-sm">
          <span className="font-medium">In return, you place a link to {site.domain}</span>
          <span className="block text-muted-foreground">
            Page: <span className="font-mono text-[13px] break-all">{site.wantedPage || `https://${site.domain}/`}</span>
          </span>
          <span className="block text-muted-foreground">
            Anchor: <b className="text-foreground">{site.wantedAnchor || site.domain}</b>
            {!site.wantedAnchor && " (they didn't set one)"}
          </span>
          <span className="block text-xs text-muted-foreground">You choose which page of {mine?.domain ?? "your site"} it goes on when you place it.</span>
        </div>
      </Section>

      {/* 3. message and send */}
      <Section n={2} title={<>Send it</>} description="Add a note if you like — they see it with the proposal.">
        <Field label="Message (optional)" hint={`${message.length}/500`}>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} placeholder="Hi! Our audiences overlap — happy to adjust the pages or anchors." rows={3} />
        </Field>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/markets/exchange" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
            <X className="size-4" /> Cancel
          </Link>
          <Button size="lg" className="rounded-full" disabled={!complete || !theyAcceptYou || !youAcceptThem || suspended || pending} onClick={() => setConfirming(true)}>
            {pending && <Loader2 className="size-4 animate-spin" />} Propose swap
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        request={
          confirming
            ? {
                title: "Send this swap proposal?",
                description: `${site.domain} is asked to place a link to ${mine?.domain ?? "your site"} and you place one back. You can cancel it after the 1-hour cooldown while it's unanswered.`,
                confirmLabel: "Send proposal",
                onConfirm: submit,
              }
            : null
        }
        pending={pending}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
