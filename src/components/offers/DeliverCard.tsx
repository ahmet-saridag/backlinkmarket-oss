"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, Gift, Link2, Loader2, PackageCheck, PanelBottom, PenLine, Star, Type, type LucideIcon } from "lucide-react";
import { deliverLink } from "@/app/(app)/offers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DateTime } from "@/components/shared/DateTime";
import { needsUrl, knownPage } from "@/lib/expected-links";
import { categoryLabels } from "@/lib/labels";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Category, Offer } from "@/lib/types";

const style: Record<Category, { icon: LucideIcon; chip: string }> = {
  guest_post: { icon: PenLine, chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  link_insertion: { icon: Link2, chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  review: { icon: Star, chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  footer_link: { icon: PanelBottom, chip: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
};

const HOURS_72 = 72 * 3_600_000;

/** When the 72 hours run out: from the payment confirmation (Paid) or the acceptance (Exchange, ABC). */
function deadline(offer: Offer): string | null {
  const from = offer.timeline.filter((t) => t.status === (offer.type === "paid" ? "PAYMENT_RECEIVED" : "ACCEPTED")).at(-1)?.at;
  return from ? new Date(new Date(from).getTime() + HOURS_72).toISOString() : null;
}

/**
 * The seller's side of the delivery: what to place, listed line by line — the ordered link and every extra dofollow
 * link. We already know the page for most lines, so a URL is only asked for where we can't (an article, a review).
 * One button: we load the page(s) ourselves, check every link, and if it is all there the offer goes live.
 */
export function DeliverCard({ offer }: { offer: Offer }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const lines = offer.brief ?? [];
  const sellerDomain = offer.yourDomain;
  const due = deadline(offer);
  const ready = lines.filter((l) => needsUrl(l, sellerDomain)).every((l) => (urls[l.category] ?? "").startsWith("http"));

  const submit = () =>
    start(async () => {
      setErrors({});
      const result = await deliverLink({ offerId: offer.id, urls });
      setConfirming(false);
      if (result.ok) {
        toast.success("Got it — we're checking your page now");
        router.refresh();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Something went wrong.");
    });

  return (
    <Card className="rounded-2xl border-2 border-amber-500/40">
      <CardHeader>
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <PackageCheck className="size-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardTitle className="text-xl">Place {lines.length + lines.reduce((n, l) => n + (l.extras?.length ?? 0), 0) === 1 ? "the link" : "these links"} on your site</CardTitle>
            <CardDescription>
              Publish exactly what&apos;s below. When you&apos;re done, press the button — we open your page{lines.length > 1 ? "s" : ""}, check every link and put the offer live. The buyer doesn&apos;t
              verify anything.
            </CardDescription>
          </div>
          {due && (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              <Clock className="size-3.5" /> Due <DateTime iso={due} />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {lines.map((line) => {
          const st = style[line.category];
          const Icon = st.icon;
          const known = knownPage(line, sellerDomain);
          return (
            <div key={line.category} className="flex flex-col gap-4 rounded-2xl border bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-9 place-items-center rounded-xl", st.chip)}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="text-base font-medium">{categoryLabels[line.category]}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {line.category === "review" ? (
                  <div className="flex flex-col gap-0.5 sm:col-span-2">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Review this</span>
                    <span className="text-[15px]">{line.productInfo}</span>
                    {line.accessDetails && <span className="text-xs text-muted-foreground">Access: {line.accessDetails}</span>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <Link2 className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Link to</span>
                        <span className="text-[15px] font-medium break-all">{line.targetUrl}</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Type className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Anchor text</span>
                        <span className="text-[15px] font-medium">“{line.anchor}”</span>
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <FileText className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Where</span>
                    <span className="text-[15px] break-all">
                      {known ?? (line.category === "guest_post" ? "In a new article on your site" : line.category === "review" ? "On a new review page on your site" : "Any page of your site — we find it")}
                    </span>
                  </span>
                </div>
              </div>

              {(line.extras?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Gift className="size-4 text-muted-foreground" />
                    Also on that same page — {line.extras.length} extra dofollow link{line.extras.length > 1 ? "s" : ""}
                  </span>
                  {line.extras.map((e, i) => (
                    <span key={i} className="pl-6 text-sm break-all">
                      {e.url} <span className="text-muted-foreground">· “{e.anchor}”</span>
                    </span>
                  ))}
                </div>
              )}

              {needsUrl(line, sellerDomain) && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] text-muted-foreground">
                    {line.category === "review" ? "URL of the review you published" : line.category === "guest_post" ? "URL of the article you published" : "URL of the page you placed it on"}
                  </span>
                  <Input
                    value={urls[line.category] ?? ""}
                    aria-invalid={!!errors[line.category]}
                    placeholder={`https://${sellerDomain}/…`}
                    onChange={(e) => setUrls((u) => ({ ...u, [line.category]: e.target.value }))}
                  />
                  {errors[line.category] && (
                    <span role="alert" className="text-xs text-destructive">
                      {errors[line.category]}
                    </span>
                  )}
                </label>
              )}
            </div>
          );
        })}

        {offer.deliveryCheck?.ok === false && offer.deliveryCheck.problems.length > 0 && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-900 dark:text-red-200">
            <span className="flex flex-wrap items-center gap-x-2 font-medium">
              We couldn&apos;t find everything{offer.deliveryCheck.at ? <> when we looked at <DateTime iso={offer.deliveryCheck.at} /></> : null}
              {offer.deliveryCheck.attempt > 1 && <span className="text-xs font-normal opacity-80">· check {offer.deliveryCheck.attempt}</span>}
            </span>
            <ul className="flex flex-col gap-2">
              {offer.deliveryCheck.problems.map((p, i) => (
                <li key={i} className="flex flex-col gap-0.5 rounded-lg bg-background/40 px-3 py-2">
                  <span className="font-medium">{p.label}</span>
                  <span className="opacity-90">{p.reason}</span>
                </li>
              ))}
            </ul>
            <span className="text-xs opacity-80">Fix it on your site, then press the button again — we&apos;ll look again straight away. We keep doing this with you until every link is there.</span>
          </div>
        )}

        <Button size="lg" className="h-12 w-fit rounded-full bg-green-600 px-7 text-white hover:bg-green-700" disabled={!ready || pending} onClick={() => setConfirming(true)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />} {offer.deliveryCheck?.ok === false ? "I've fixed it — check again" : "I've placed it — check and go live"}
        </Button>
      </CardContent>

      <ConfirmDialog
        request={
          confirming
            ? {
                title: "Check your page and go live?",
                description: "We open your page(s) right away and look for every link above. If they're all there, dofollow and with the right anchor text, the offer goes live and the buyer is told. If not, you'll see exactly what we found and where, fix it, and press again.",
                confirmLabel: "Yes, check now",
                onConfirm: submit,
              }
            : null
        }
        pending={pending}
        onClose={() => setConfirming(false)}
      />
    </Card>
  );
}
