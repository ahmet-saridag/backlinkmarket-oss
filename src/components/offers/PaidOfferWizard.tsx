"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Landmark, Plus, Send, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/shared/Callout";
import { Field } from "@/components/shared/Field";
import { SitemapSearch } from "@/components/shared/SitemapSearch";
import { Stepper } from "@/components/shared/Stepper";
import { SummaryList } from "@/components/shared/SummaryList";
import { useIsSuspended } from "@/components/standing/standing";
import { sendOffer } from "@/app/(app)/offers/actions";
import { toast } from "@/lib/toast";
import { categoryLabels, durationLabels, formatNumber, formatUsd, roundCents } from "@/lib/labels";
import { platformLimits } from "@/lib/market-rules";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PaysVia } from "@/components/markets/PaysVia";
import { payoutViaLabel } from "@/lib/validation/account";
import { cn } from "@/lib/utils";
import type { Category, CategoryListing, ConditionCheck, MarketSite, UserSite } from "@/lib/types";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { OfferSitePicker, useEligibility } from "@/components/offers/OfferSitePicker";
import { WizardActionBar } from "@/components/offers/WizardActionBar";

const MAX_EXTRA_DOFOLLOW = 2;

interface ExtraLink {
  url: string;
  anchor: string;
}

interface Brief {
  targetUrl: string;
  anchor: string;
  topic: string;
  /** Link Insertion: the seller's page the link goes into */
  sellerPage: string | null;
  /** Review */
  productInfo: string;
  accessDetails: string;
  extras: ExtraLink[];
}

const emptyBrief = (): Brief => ({
  targetUrl: "",
  anchor: "",
  topic: "",
  sellerPage: null,
  productInfo: "",
  accessDetails: "",
  extras: [],
});

const steps = ["Your site", "Categories", "Brief", "Pricing", "Payment", "Summary"];

const aiPolicyText = { not_accepted: "no AI content", ai_assisted: "AI-assisted content OK", any: "no AI preference" } as const;

/** Category-specific seller requirement as one line, e.g. "1,000–2,000 words, no AI content". */
function sellerRequirement(l: CategoryListing): string | null {
  if (l.category === "guest_post" && (l.minWords || l.aiPolicy)) {
    const parts = [];
    if (l.minWords && l.maxWords) parts.push(`${formatNumber(l.minWords)}–${formatNumber(l.maxWords)} words`);
    if (l.aiPolicy) parts.push(aiPolicyText[l.aiPolicy]);
    return parts.join(", ");
  }
  if (l.category === "review" && l.reviewProcess) return `Review process & turnaround — ${l.reviewProcess}`;
  return null;
}

const discounted = (l: CategoryListing) => roundCents(l.price * (1 - l.discountPct / 100));
const pathOf = (url: string) => url.replace(/^https?:\/\/[^/]+/, "") || "/";

function briefValid(category: Category, b: Brief) {
  const extrasOk = b.extras.every((e) => e.url.startsWith("http") && e.anchor.trim());
  if (category === "review") return !!b.productInfo.trim() && !!b.accessDetails.trim() && extrasOk;
  if (category === "link_insertion" && !b.sellerPage) return false;
  return b.targetUrl.startsWith("http") && !!b.anchor.trim() && extrasOk;
}

export function PaidOfferWizard({
  site,
  mySites,
  checksBySite,
  sitemapPages,
}: {
  site: MarketSite;
  mySites: UserSite[];
  /** Pre-send checks per one of your sites (by id) */
  checksBySite: Record<string, ConditionCheck[]>;
  /** The seller's real sitemap pages */
  sitemapPages: string[];
}) {
  const [step, setStep] = useState(0);
  const eligibility = useEligibility(mySites, checksBySite);
  // The user picks the site here; with a single site there is nothing to pick
  const [picked, setPicked] = useState<string | null>(null);
  const fromId = picked ?? (eligibility.length === 1 ? eligibility[0].site.id : null);
  const from = eligibility.find((x) => x.site.id === fromId) ?? null;
  const yourDomain = from?.site.domain ?? "yoursite.com";
  const suspended = useIsSuspended();
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Category[]>([]);
  const [briefs, setBriefs] = useState<Partial<Record<Category, Brief>>>({});
  const sellerSitemap = sitemapPages;

  const listings = site.listings.filter((l) => selected.includes(l.category));
  const briefFor = (c: Category) => briefs[c] ?? emptyBrief();
  const updateBrief = (c: Category, patch: Partial<Brief>) =>
    setBriefs((prev) => ({ ...prev, [c]: { ...briefFor(c), ...patch } }));

  // Discount applies to the category price; extra dofollow fees are added on top.
  const lines = listings.map((l) => {
    const extras = briefFor(l.category).extras.length;
    const net = discounted(l);
    const extraFee = extras * l.dofollowFee;
    return { listing: l, extras, net, discount: roundCents(l.price - net), extraFee, total: roundCents(net + extraFee) };
  });
  const subtotal = roundCents(lines.reduce((a, x) => a + x.listing.price + x.extraFee, 0));
  const discountTotal = roundCents(lines.reduce((a, x) => a + x.discount, 0));
  const total = roundCents(subtotal - discountTotal);
  const withinLimits = total >= platformLimits.minTotal && total <= platformLimits.maxTotal;

  const valid = [
    !!from?.eligible,
    selected.length > 0,
    selected.every((c) => briefValid(c, briefFor(c))),
    withinLimits,
    true,
    true,
  ];

  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  const send = () => {
    if (!fromId) return;
    startTransition(async () => {
      const result = await sendOffer({
        type: "paid",
        buyerSiteId: fromId,
        sellerSiteId: site.id,
        message: message.trim() || undefined,
        lines: listings.map((l) => {
          const b = briefFor(l.category);
          return {
            category: l.category,
            targetUrl: b.targetUrl || undefined,
            anchor: b.anchor || undefined,
            topic: b.topic || undefined,
            sellerPage: b.sellerPage ?? undefined,
            productInfo: b.productInfo || undefined,
            accessDetails: b.accessDetails || undefined,
            extras: b.extras,
          };
        }),
      });
      setConfirming(false);
      if (result.ok) {
        toast.success(`Offer sent to ${site.domain}`);
        setSent(true);
      } else {
        toast.error(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Couldn't send the offer.");
      }
    });
  };

  const topRef = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const catCount = selected.length;
  const hints = [
    !from
      ? "Pick the site the link is for"
      : from.eligible
        ? `Link goes to ${from.site.domain}`
        : `${from.site.domain} doesn't qualify — pick another site`,
    catCount ? `${catCount} categor${catCount > 1 ? "ies" : "y"} selected · ${formatUsd(total)}` : "Select at least one category",
    valid[2] ? "Brief complete" : "Fill in the brief for each category",
    withinLimits ? `Total ${formatUsd(total)}` : `Total must be between ${formatUsd(platformLimits.minTotal)} and ${formatUsd(platformLimits.maxTotal)}`,
    `You'll pay ${site.domain} directly once they accept`,
    "Check everything, then send — nothing is charged automatically at any point",
  ];

  if (sent) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CircleCheck className="size-10 text-score-hot" />
          <h2 className="text-xl font-medium">Offer sent to {site.domain}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Once {site.domain} accepts, you&apos;ll see their payout details and pay them directly. You can cancel after the
            1-hour cooldown while the offer is still Sent.
          </p>
          <Link href="/offers" className={cn(buttonVariants(), "mt-2 rounded-full")}>
            Go to Offers
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={topRef} className="scroll-mt-4">
        <Stepper steps={steps} current={step} />
      </div>

      {step === 0 && <OfferSitePicker market={site} rows={eligibility} selectedId={fromId} onSelect={setPicked} />}

      {step === 1 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Select one or more — at least one is required.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {site.listings.map((l) => {
              const on = selected.includes(l.category);
              return (
                <label
                  key={l.category}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 hover:bg-muted/40", on && "bg-muted/40")}
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) =>
                      setSelected((prev) => (v ? [...prev, l.category] : prev.filter((c) => c !== l.category)))
                    }
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{categoryLabels[l.category]}</span>
                    <span className="text-xs text-muted-foreground">
                      {durationLabels[l.duration]} · +{formatUsd(l.dofollowFee)} per extra dofollow
                    </span>
                  </span>
                  <span className="text-right font-medium tabular-nums">
                    {formatUsd(l.price)}
                    {l.discountPct > 0 && (
                      <span className="block text-xs font-normal text-green-700 dark:text-green-400">
                        {l.discountPct}% off: {formatUsd(discounted(l))}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </CardContent>
        </Card>
      )}

      {step === 2 &&
        listings.map((l) => {
          const b = briefFor(l.category);
          const sellerPages = l.pages?.length ? l.pages : sellerSitemap;
          const requirement = sellerRequirement(l);
          return (
            <Card key={l.category} className="rounded-2xl">
              <CardHeader>
                <CardTitle>{categoryLabels[l.category]} brief</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {requirement && (
                  <Callout variant="warning" title="Seller requirement">
                    {requirement}
                  </Callout>
                )}
                <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3">
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Other seller notes (read-only)
                  </span>
                  <ul className="mt-1 list-disc pl-4 text-[13px]">
                    {l.requirements.length ? l.requirements.map((r) => <li key={r}>{r}</li>) : <li>No extra requirements</li>}
                  </ul>
                </div>

                {l.category === "review" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Product / service info">
                      <Textarea
                        value={b.productInfo}
                        onChange={(e) => updateBrief(l.category, { productInfo: e.target.value })}
                        placeholder="What should be reviewed, key features, who it's for"
                      />
                    </Field>
                    <Field label="Access link / details">
                      <Textarea
                        value={b.accessDetails}
                        onChange={(e) => updateBrief(l.category, { accessDetails: e.target.value })}
                        placeholder="Trial link, demo account instructions…"
                      />
                    </Field>
                  </div>
                ) : (
                  <>
                    {l.category === "link_insertion" && (
                      <Field
                        label={l.pages?.length ? "Pick from the seller's slots" : sellerPages.length ? "Seller hasn't restricted pages — pick from their sitemap" : "No sitemap found — enter the seller's page URL"}
                        hint={b.sellerPage ?? "Pick one page"}
                      >
                        {sellerPages.length ? (
                          <SitemapSearch
                            pages={sellerPages}
                            selected={b.sellerPage ? [b.sellerPage] : []}
                            onToggle={(p) => updateBrief(l.category, { sellerPage: b.sellerPage === p ? null : p })}
                          />
                        ) : (
                          <Input
                            value={b.sellerPage ?? ""}
                            placeholder={`https://${site.domain}/…`}
                            onChange={(e) => updateBrief(l.category, { sellerPage: e.target.value || null })}
                          />
                        )}
                      </Field>
                    )}
                    <div className={cn("grid gap-3", l.category === "guest_post" ? "md:grid-cols-3" : "md:grid-cols-2")}>
                      <Field label="Target URL">
                        <Input
                          value={b.targetUrl}
                          placeholder={`https://${yourDomain}/…`}
                          onChange={(e) => updateBrief(l.category, { targetUrl: e.target.value })}
                        />
                      </Field>
                      <Field label="Anchor">
                        <Input
                          value={b.anchor}
                          placeholder="e.g. technical SEO checklist"
                          onChange={(e) => updateBrief(l.category, { anchor: e.target.value })}
                        />
                      </Field>
                      {l.category === "guest_post" && (
                        <Field label="Topic / context">
                          <Input value={b.topic} onChange={(e) => updateBrief(l.category, { topic: e.target.value })} />
                        </Field>
                      )}
                    </div>
                  </>
                )}

                {b.extras.map((x, i) => (
                  <div key={i} className="grid gap-3 rounded-xl border px-3 py-3 md:grid-cols-[1fr_1fr_auto]">
                    <Field label={`Dofollow link ${i + 2} — Target URL (+${formatUsd(l.dofollowFee)})`}>
                      <Input
                        value={x.url}
                        onChange={(e) => updateBrief(l.category, { extras: b.extras.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) })}
                      />
                    </Field>
                    <Field label="Anchor">
                      <Input
                        value={x.anchor}
                        onChange={(e) => updateBrief(l.category, { extras: b.extras.map((y, j) => (j === i ? { ...y, anchor: e.target.value } : y)) })}
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="self-end"
                      aria-label="Remove extra link"
                      onClick={() => updateBrief(l.category, { extras: b.extras.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={b.extras.length >= MAX_EXTRA_DOFOLLOW || l.dofollowFee === 0}
                    onClick={() => updateBrief(l.category, { extras: [...b.extras, { url: "", anchor: "" }] })}
                  >
                    <Plus className="size-3.5" /> Add extra dofollow (max 2, 3 in total)
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {l.dofollowFee > 0
                      ? `The seller's +dofollow fee (${formatUsd(l.dofollowFee)}) is added per extra link.`
                      : "This seller doesn't offer extra dofollow links for this category."}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}

      {step === 3 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Price</CardTitle>
            <CardDescription>Discounts and extra dofollow links applied; platform limit verified.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {lines.map((x) => (
              <div key={x.listing.category} className="flex flex-col gap-1 border-b pb-3">
                <Row label={`${categoryLabels[x.listing.category]} (${durationLabels[x.listing.duration]})`} value={formatUsd(x.listing.price)} />
                {x.discount > 0 && (
                  <Row label={`${x.listing.discountPct}% discount → ${formatUsd(x.net)}`} value={`−${formatUsd(x.discount)}`} muted />
                )}
                {x.extras > 0 && (
                  <Row label={`+ ${x.extras} extra dofollow link${x.extras > 1 ? "s" : ""}`} value={formatUsd(x.extraFee)} muted />
                )}
              </div>
            ))}
            <Row label="Subtotal" value={formatUsd(subtotal)} muted />
            <Row label="Discounts" value={`−${formatUsd(discountTotal)}`} muted />
            <Row label="Total" value={formatUsd(total)} strong />
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs",
                withinLimits ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400",
              )}
            >
              {withinLimits ? <CircleCheck className="size-3.5" /> : <CircleX className="size-3.5" />}
              {withinLimits ? "Within" : "Outside"} the platform limit (min {formatUsd(platformLimits.minTotal)} / max{" "}
              {formatUsd(platformLimits.maxTotal)}).
            </p>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>There&apos;s no escrow and no saved card — you pay the seller directly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {site.seller?.payoutMethod ? (
              <div className="flex flex-col gap-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                  <Landmark className="size-4" /> {site.domain} accepts payment only by:
                </span>
                <PaysVia seller={site.seller} className="w-fit text-sm" />
                <span className="text-sm text-amber-900/90 dark:text-amber-100/90">
                  Send the money that way and no other. You can&apos;t pay by card, and a payment sent by another method — or to another address — can&apos;t be recovered.
                  If you can&apos;t pay this way, don&apos;t send the offer.
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <Landmark className="size-5 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Once {site.domain} accepts, you&apos;ll see their payout details and send the payment yourself, then tell them you&apos;ve paid. We can&apos;t see the
                transfer — {site.domain} confirms receipt once it lands. If it doesn&apos;t work for you, you can withdraw before you pay.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Summary — <SiteLabel domain={site.domain} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SummaryList
              items={[
                { label: "Link for", value: <SiteLabel domain={yourDomain} className="text-[13px]" /> },
                ...lines.map((x) => {
                  const b = briefFor(x.listing.category);
                  const price = `${formatUsd(x.net)}${x.extras ? ` + ${formatUsd(x.extraFee)} (${x.extras} extra)` : ""}`;
                  const detail =
                    x.listing.category === "review"
                      ? `Product: ${b.productInfo} — Access: ${b.accessDetails}`
                      : x.listing.category === "link_insertion"
                        ? `Slot: ${pathOf(b.sellerPage ?? "")} — Target: ${b.targetUrl} — Anchor: “${b.anchor}”`
                        : `Target: ${b.targetUrl} — Anchor: “${b.anchor}”${b.topic ? ` — Topic: ${b.topic}` : ""}`;
                  return {
                    label: `${categoryLabels[x.listing.category]} — ${price}`,
                    value: <span className="text-[13px]">{detail}</span>,
                  };
                }),
                {
                  label: "Total",
                  value: (
                    <strong>
                      {formatUsd(total)} — paid directly to {site.domain} once accepted{site.seller?.payoutMethod ? `, by ${payoutViaLabel(site.seller.payoutMethod, site.seller.payoutNetwork)} only` : ""}
                    </strong>
                  ),
                },
              ]}
            />
            <Field label={`A note to ${site.domain} (optional)`} hint={`${message.length}/500`}>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={3} placeholder="Anything they should know about this order." />
            </Field>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              <li>⏱ You can&apos;t cancel for the first hour after sending (cooldown).</li>
              <li>
                By continuing you agree to the{" "}
                <a href="/buyer-rules" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">
                  Buyer Rules
                </a>
                .
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      <WizardActionBar
        steps={steps}
        step={step}
        hint={hints[step]}
        ok={valid[step]}
        onGo={go}
        finish={
          <Button className="flex-1 rounded-full sm:flex-none" size="lg" disabled={suspended || pending} onClick={() => setConfirming(true)}>
            <Send className="size-4" /> Send offer · {formatUsd(total)}
          </Button>
        }
      />
      <ConfirmDialog
        request={
          confirming
            ? {
                title: `Send this offer for ${formatUsd(total)}?`,
                description: `${site.domain} sees it and can accept or decline. If they accept you pay them directly${site.seller?.payoutMethod ? ` by ${payoutViaLabel(site.seller.payoutMethod, site.seller.payoutNetwork)} only` : ""} — nothing is charged now. You can cancel after the 1-hour cooldown while it's unanswered.`,
                confirmLabel: "Send offer",
                onConfirm: send,
              }
            : null
        }
        pending={pending}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", muted && "text-muted-foreground", strong && "pt-1 text-base font-medium")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
