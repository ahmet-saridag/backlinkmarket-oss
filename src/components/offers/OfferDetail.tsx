"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Ban, Banknote, Check, CircleCheck, Copy, ExternalLink, FileText, Gift, Landmark, Link2, Loader2, OctagonAlert, Receipt, PanelBottom, PauseCircle, PenLine, Search, ServerCrash, Star, Tag, Type, Undo2, type LucideIcon } from "lucide-react";
import {
  acceptOffer,
  cancelOffer,
  confirmPaymentReceived,
  markPaymentSent,
  reportPaymentNotReceived,
  rejectOffer,
  rescanLink,
  withdrawAcceptedOffer,
} from "@/app/(app)/offers/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/shared/Callout";
import { Input } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { ConfirmDialog, type ConfirmRequest } from "@/components/shared/ConfirmDialog";
import { DateTime } from "@/components/shared/DateTime";
import { AbcCycle, roomSeats } from "@/components/markets/AbcCycle";
import { DeliverCard } from "@/components/offers/DeliverCard";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { OfferStatusBadge } from "@/components/shared/OfferStatusBadge";
import { useTimeZone } from "@/components/account/user-context";
import { displayTraffic } from "@/lib/traffic-ranges";
import { categoryLabels, formatUsd, marketLabels } from "@/lib/labels";
import { isDeliverer } from "@/lib/offer-actions";
import { isLiveLink, nextStep, offerStage, stageMeta, type OfferStage } from "@/lib/offer-stage";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { payoutMethodLabels } from "@/lib/validation/account";
import { swapWithdrawReasons, withdrawReasons } from "@/lib/validation/offer";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import type { Category, Offer, OfferBriefLine, PayoutDetails, PoolContext } from "@/lib/types";
import { SellerAvatar } from "@/components/markets/SellerAvatar";
import { SiteLabel } from "@/components/shared/SiteFavicon";

/** A check that started more than three minutes ago and never answered (the server was interrupted): the seller may start it again. */
const isStuck = (o: Offer) => !o.deliveryCheck?.startedAt || Date.now() - Date.parse(o.deliveryCheck.startedAt) > 3 * 60_000;

const anomalyText = {
  link_missing: "The link is missing from the page",
  nofollow: "The link was switched to nofollow",
  site_down: "The site is not responding",
};

/**
 * Offer detail whose main panel depends on the offer state. Every action goes through a server
 * action that re-checks who you are and what state the offer is in.
 */
export function OfferDetail({ offer, counterpartyDr, payout, proofUrl }: { offer: Offer; counterpartyDr: number; payout: PayoutDetails | null; proofUrl?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [proofError, setProofError] = useState<string | null>(null);
  const [ask, setAsk] = useState<ConfirmRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>, success: string, onFinish?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
      } else {
        toast.error(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Something went wrong.");
      }
      router.refresh();
      onFinish?.();
    });

  const copyAddress = () => {
    if (!payout) return;
    navigator.clipboard?.writeText(payout.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /** Every action that changes an offer asks first. */
  const confirmThen = (
    cfg: { title: string; description: React.ReactNode; confirmLabel: string; tone?: "danger" | "default" },
    action: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>,
    success: string,
  ) => setAsk({ ...cfg, summary: <DealSummary offer={offer} />, onConfirm: () => run(action, success, () => setAsk(null)) });

  // While we're looking at the page, keep asking for the result so both sides see it change on its own
  // (only while a check is really running — never for one that is old or stuck, or the page would ask forever)
  const checking = offer.status === "DELIVERED" && !isStuck(offer);
  useEffect(() => {
    if (!checking) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [checking, router]);

  const youDeliver = isDeliverer(offer);
  const youPay = offer.type === "paid" && offer.direction === "sent";
  const canCancel = offer.status === "SENT" && offer.direction === "sent" && offer.cooldownMinutesLeft === 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-6">
        {/* ---- where it stands: stage, next step, progress and who links to whom ---- */}
        <StandingHero offer={offer} canCancel={canCancel} onCancel={() =>
            confirmThen(
              { title: "Cancel this offer?", description: `${offer.counterpartyDomain} hasn't answered yet. Cancelling withdraws it — nothing was paid.`, confirmLabel: "Cancel offer", tone: "danger" },
              () => cancelOffer(offer.id),
              "Offer cancelled",
            )
          } pending={pending} />

        {offer.type === "abc" && offer.pool && <PoolLoopCard offer={offer} pool={offer.pool} />}

        <ConfirmDialog request={ask} pending={pending} onClose={() => setAsk(null)} />

        {offer.message && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                Message {offer.direction === "received" ? "from" : "to"} <SiteLabel domain={offer.counterpartyDomain} size={16} className="font-medium text-foreground" />
              </span>
              {offer.counterpartyOwner && <OwnerBlock owner={offer.counterpartyOwner} />}
              <p className="rounded-xl bg-muted/40 p-3 text-sm whitespace-pre-wrap">{offer.message}</p>
            </CardContent>
          </Card>
        )}

        {/* ---- state-specific panel ---- */}

        {offer.status === "SENT" &&
          (offer.direction === "received" ? (
            <OrderCard
              offer={offer}
              prominent
              actions={
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {offer.type === "exchange"
                      ? "Accepting starts a link swap: they place a link on your site's counterpart page, and you place one back on yours."
                      : offer.type === "paid"
                        ? `Accepting shares your payout details with the buyer, who then pays you ${offer.amount ? formatUsd(offer.amount) : ""} directly. You publish the link only after the money reached you.`
                        : "Accepting locks the deal in — each side then places its link."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="lg" className="h-11 rounded-full bg-green-600 px-6 text-white hover:bg-green-700" disabled={pending} onClick={() =>
                        confirmThen(
                          {
                            title: "Accept this offer?",
                            description:
                              offer.type === "paid"
                                ? `You agree to place what's ordered on ${offer.yourDomain}. ${offer.counterpartyDomain} is shown your payout details and pays you ${offer.amount ? formatUsd(offer.amount) : ""} directly. You publish only after the money reached you.`
                                : "You agree to place your link. Both sides then have 72 hours.",
                            confirmLabel: "Yes, accept",
                          },
                          () => acceptOffer(offer.id),
                          "Offer accepted",
                        )
                      }>
                      <CircleCheck className="size-4" /> Accept this offer
                    </Button>
                    <Button size="lg" variant="outline" className="h-11 rounded-full border-red-500/40 px-6 text-red-700 hover:bg-red-500/10 dark:text-red-400" disabled={pending} onClick={() =>
                        confirmThen(
                          { title: "Decline this offer?", description: `${offer.counterpartyDomain} is told you said no. This can't be undone.`, confirmLabel: "Yes, decline", tone: "danger" },
                          () => rejectOffer(offer.id),
                          "Offer declined",
                        )
                      }>
                      Decline
                    </Button>
                  </div>
                </div>
              }
            />
          ) : (
            <Callout title={`Waiting for ${offer.counterpartyDomain} to respond`}>
              You can cancel only while the offer is still Sent and after the 1-hour cooldown.
            </Callout>
          ))}

        {offer.status === "ACCEPTED" &&
          (offer.type !== "paid" ? (
            youDeliver ? (
              <DeliverCard offer={offer} />
            ) : (
              <Callout title={`Waiting for ${offer.counterpartyDomain} to place the link`}>
                They have 72 hours. We check it ourselves and tell you the moment it&apos;s live — there&apos;s nothing for you to verify. Your own link back is a separate offer in Offers.
              </Callout>
            )
          ) : youPay ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Pay {offer.counterpartyDomain}</CardTitle>
                <CardDescription>
                  Send {offer.amount ? formatUsd(offer.amount) : "the agreed amount"} directly using the payout details {offer.counterpartyDomain}{" "}
                  shared with you (wire, PayPal, USDT or bank transfer).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {payout ? (
                  <dl className="grid gap-2 rounded-xl border px-4 py-3 text-sm sm:grid-cols-[120px_1fr]">
                    <dt className="text-muted-foreground">Method</dt>
                    <dd className="font-medium">{payoutMethodLabels[payout.method]}</dd>
                    {payout.method === "crypto" ? (
                      <>
                        <dt className="text-muted-foreground">Asset</dt>
                        <dd>USDT</dd>
                      </>
                    ) : (
                      <>
                        <dt className="text-muted-foreground">Account holder</dt>
                        <dd>{payout.accountHolder}</dd>
                      </>
                    )}
                    {payout.network && (
                      <>
                        <dt className="text-muted-foreground">{payout.method === "crypto" ? "Network" : payout.method === "wire" ? "SWIFT / BIC" : "Bank code"}</dt>
                        <dd className="font-mono text-xs">{payout.network}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">{payout.method === "paypal" ? "PayPal e-mail" : payout.method === "crypto" ? "Wallet address" : "IBAN / account"}</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-mono text-xs break-all">{payout.address}</span>
                      <Button variant="outline" size="icon" className="size-7 shrink-0" aria-label={copied ? "Copied" : "Copy"} onClick={copyAddress}>
                        {copied ? <Check className="size-3.5 text-green-600 dark:text-green-400" /> : <Copy className="size-3.5" />}
                      </Button>
                    </dd>
                  </dl>
                ) : (
                  <Callout variant="warning" title="Payout details unavailable">
                    We couldn&apos;t load {offer.counterpartyDomain}&apos;s payout details. Ask them to check their Account page.
                  </Callout>
                )}
                {payout && (
                  <Callout variant="warning" title={`${offer.counterpartyDomain} accepts payment only by ${payoutMethodLabels[payout.method]}${payout.method === "crypto" && payout.network ? ` (USDT · ${payout.network})` : ""}`}>
                    Send {offer.amount ? formatUsd(offer.amount) : "the agreed amount"} to exactly the details above and nowhere else. A payment sent to another address or by another
                    method can&apos;t be recovered — Backlink Market never holds or moves the money.
                  </Callout>
                )}
                <div className="flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] text-muted-foreground">
                  <Landmark className="size-4 shrink-0" />
                  Backlink Market can&apos;t see whether you&apos;ve sent it — tell {offer.counterpartyDomain} once you have, and they confirm when it arrives.
                </div>

                {!offer.paymentSentAt && !withdrawing && (
                  <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed p-4">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Receipt className="size-4" /> Proof of payment <span className="text-destructive">*</span>
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Required. Upload the bank transfer receipt, the IBAN transfer confirmation or a screenshot of the transaction. {offer.counterpartyDomain} sees it before confirming.
                    </p>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f && f.size > 5 * 1024 * 1024) {
                          setProofFile(null);
                          setProofError("The file is over 5 MB.");
                        } else if (f && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) {
                          setProofFile(null);
                          setProofError("Use a JPG, PNG, WebP or PDF file.");
                        } else {
                          setProofFile(f);
                          setProofError(null);
                        }
                      }}
                    />
                    {proofError && <p role="alert" className="text-xs text-destructive">{proofError}</p>}
                    <Input value={proofNote} maxLength={200} onChange={(e) => setProofNote(e.target.value)} placeholder="Reference or transaction ID (optional)" />
                  </div>
                )}

                {offer.paymentSentAt ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">
                    <CircleCheck className="size-5 shrink-0" />
                    <span>
                      You told them you paid on <b><DateTime iso={offer.paymentSentAt} /></b>. They&apos;ll confirm as soon as it reaches them, then place your link.
                      {proofUrl && (
                        <>
                          {" "}
                          <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                            Your proof
                          </a>
                        </>
                      )}
                    </span>
                  </div>
                ) : withdrawing ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <span className="text-sm font-medium">Withdraw this offer</span>
                    <SimpleSelect value={reason} onChange={setReason} placeholder="Why are you withdrawing?" options={withdrawReasons.map((r) => ({ value: r, label: r }))} />
                    <p className="text-xs text-muted-foreground">{offer.counterpartyDomain} is told you withdrew and the reason. Nothing was paid, nothing is owed.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        className="rounded-full"
                        disabled={!reason || pending}
                        onClick={() =>
                          confirmThen(
                            { title: "Withdraw this offer?", description: `${offer.counterpartyDomain} is told you withdrew and why. Nothing was paid, nothing is owed.`, confirmLabel: "Yes, withdraw", tone: "danger" },
                            () => withdrawAcceptedOffer(offer.id, reason!),
                            "Offer withdrawn",
                          )
                        }
                      >
                        <Undo2 className="size-4" /> Withdraw offer
                      </Button>
                      <Button variant="outline" className="rounded-full" disabled={pending} onClick={() => setWithdrawing(false)}>
                        Keep it
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="lg" className="h-11 rounded-full bg-green-600 px-6 text-white hover:bg-green-700" disabled={pending || !payout || !proofFile} onClick={() =>
                        confirmThen(
                          { title: "Have you really sent the payment?", description: `${offer.counterpartyDomain} is told you paid ${offer.amount ? formatUsd(offer.amount) : "them"} and sees your proof. Only confirm once you have sent it — you can't withdraw the offer afterwards.`, confirmLabel: "Yes, I paid" },
                          async () => {
                            const file = proofFile!;
                            const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
                            const path = `${offer.id}/${crypto.randomUUID()}.${ext}`;
                            const up = await createBrowserClient().storage.from("payment-proofs").upload(path, file, { contentType: file.type, upsert: false });
                            if (up.error) return { ok: false, error: "We couldn't upload your proof — try again." };
                            return markPaymentSent(offer.id, path, proofNote);
                          },
                          "They've been told you paid",
                        )
                      }>
                      <Banknote className="size-4" /> I&apos;ve sent the payment
                    </Button>
                    <Button size="lg" variant="outline" className="h-11 rounded-full px-6" disabled={pending} onClick={() => setWithdrawing(true)}>
                      <Undo2 className="size-4" /> I can&apos;t pay this way
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Confirm payment from {offer.counterpartyDomain}</CardTitle>
                <CardDescription>
                  We can&apos;t see money move — only you know when it lands in your account. Confirm once you&apos;ve actually
                  received it.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {offer.paymentSentAt ? (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                    <Banknote className="size-5 shrink-0" />
                    <span>
                      {offer.counterpartyDomain} says they sent {offer.amount ? formatUsd(offer.amount) : "the payment"} on <b><DateTime iso={offer.paymentSentAt} /></b>. Check your account before you confirm.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
                    <Landmark className="size-5 shrink-0" />
                    <span>Waiting for {offer.counterpartyDomain} to pay. You&apos;ll be notified when they say they have.</span>
                  </div>
                )}
                {offer.paymentSentAt && (
                  <div className="flex flex-col gap-2 rounded-xl border p-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Receipt className="size-4" /> Their proof of payment
                    </span>
                    {offer.paymentReference && <span className="text-xs text-muted-foreground">Reference: <span className="font-mono">{offer.paymentReference}</span></span>}
                    {proofUrl ? (
                      /\.pdf($|\?)/i.test(offer.paymentProofPath ?? "") ? (
                        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1.5 text-sm underline underline-offset-2">
                          <FileText className="size-4" /> Open the PDF <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block w-fit">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proofUrl} alt="Proof of payment" className="max-h-64 rounded-lg border object-contain" />
                        </a>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">No proof is attached to this offer.</span>
                    )}
                  </div>
                )}
                {offer.paymentSentAt && (
                  <Button
                    size="lg"
                    className="h-11 w-fit rounded-full bg-green-600 px-6 text-white hover:bg-green-700"
                    disabled={pending}
                    onClick={() =>
                      confirmThen(
                        {
                          title: "Did the money reach you?",
                          description: `Confirm only if ${offer.amount ? formatUsd(offer.amount) : "the payment"} is really in your account. After this you have 72 hours to place the link.`,
                          confirmLabel: "Yes, I received it",
                        },
                        () => confirmPaymentReceived(offer.id),
                        "Payment confirmed",
                      )
                    }
                  >
                    <CircleCheck className="size-4" /> I received the payment
                  </Button>
                )}
                {offer.paymentSentAt && (
                  <Button
                    variant="outline"
                    className="w-fit rounded-full"
                    disabled={pending}
                    onClick={() =>
                      confirmThen(
                        {
                          title: "The money didn't reach you?",
                          description: `The offer is closed. Nobody is penalised and ${offer.counterpartyDomain} is told you didn't receive it; their proof stays on record. Don't do this if the money is in your account — you'd be saying something untrue.`,
                          confirmLabel: "Yes, it didn't arrive",
                          tone: "danger",
                        },
                        () => reportPaymentNotReceived(offer.id),
                        "Offer closed",
                      )
                    }
                  >
                    <Undo2 className="size-4" /> I didn&apos;t receive it
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

        {offer.status === "ACCEPTED" && offer.type === "exchange" && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col gap-3">
              {withdrawing ? (
                <>
                  <span className="text-sm font-medium">Withdraw from this swap</span>
                  <SimpleSelect value={reason} onChange={setReason} placeholder="Why are you pulling out?" options={swapWithdrawReasons.map((r) => ({ value: r, label: r }))} />
                  <p className="text-xs text-muted-foreground">Both offers of the swap are cancelled and {offer.counterpartyDomain} is told why. Possible until one of the links is live.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      disabled={!reason || pending}
                      onClick={() =>
                        confirmThen(
                          { title: "Withdraw from the swap?", description: `Nothing is placed on either site. ${offer.counterpartyDomain} is told you pulled out and why.`, confirmLabel: "Yes, withdraw", tone: "danger" },
                          () => withdrawAcceptedOffer(offer.id, reason!),
                          "Swap withdrawn",
                        )
                      }
                    >
                      <Undo2 className="size-4" /> Withdraw from swap
                    </Button>
                    <Button variant="outline" className="rounded-full" disabled={pending} onClick={() => setWithdrawing(false)}>
                      Keep it
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">Can&apos;t place your link? You can pull out of the swap until one of the two links is live.</span>
                  <Button variant="outline" className="rounded-full" onClick={() => setWithdrawing(true)}>
                    <Undo2 className="size-4" /> Withdraw from swap
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {offer.status === "PAYMENT_RECEIVED" &&
          (youDeliver ? (
            <DeliverCard offer={offer} />
          ) : (
            <Callout title={`Payment confirmed — ${offer.counterpartyDomain} is placing your link`}>
              They confirmed your payment arrived and have 72 hours to place it. We check the page ourselves and tell you the moment it&apos;s live — there&apos;s nothing for you to verify.{offer.deliveryCheck?.ok === false && " We already looked once and something was still missing — they've been told exactly what to fix."}
            </Callout>
          ))}

        {offer.status === "DELIVERED" &&
          (youDeliver && isStuck(offer) ? (
            <DeliverCard offer={offer} />
          ) : (
            <Card className="rounded-2xl border-2 border-sky-500/40">
              <CardContent className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
                  <Loader2 className="size-6 animate-spin" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-lg font-medium">{youDeliver ? "We're checking your page now" : `${offer.counterpartyDomain} says it's placed — we're checking it now`}</span>
                  <span className="text-sm text-muted-foreground">
                    {youDeliver
                      ? "We're opening your page(s) and looking for every link. This takes a few seconds; the page updates by itself."
                      : "We open their page ourselves and check every link — there's nothing for you to verify. You'll be told the moment it's live."}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}


        {(offer.status === "ACTIVE_MONITORING" || (offer.status === "COMPLETED" && !!offer.deliveredUrl)) && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{offer.status === "COMPLETED" ? "Completed — the link is live" : "Link is live"}</CardTitle>
              <CardDescription>
                {offer.linkStatus
                  ? <>Last checked <DateTime iso={offer.linkStatus.lastScan} /> · {offer.linkStatus.dofollow ? "dofollow" : "nofollow"} · anchor {offer.linkStatus.anchorMatches ? "matches" : "differs"}</>
                  : "We check every link daily."}
                {offer.status === "COMPLETED" && " A permanent placement is complete once it's verified live; we keep checking it."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {offer.brief && (
                <ul className="flex flex-col gap-2 text-sm">
                  {offer.brief.map((l) => {
                    const page = l.category === "footer_link" ? `https://${offer.direction === "received" ? offer.yourDomain : offer.counterpartyDomain}/` : (l.sellerPage ?? offer.deliveries?.[l.category]);
                    return (
                      <li key={l.category} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2">
                        <span className="font-medium">{categoryLabels[l.category]}</span>
                        {page && <UrlLink url={page} />}
                        {l.extras.length > 0 && <span className="text-xs text-muted-foreground">+ {l.extras.length} extra dofollow link{l.extras.length > 1 ? "s" : ""}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="w-fit rounded-full" disabled={pending} onClick={() => run(() => rescanLink(offer.id), "Link is still live")}>
                {pending && <Loader2 className="size-4 animate-spin" />} Scan now
              </Button>
              <Link href="/backlinks" className={cn(buttonVariants({ variant: "outline" }), "w-fit rounded-full")}>
                <Link2 className="size-3.5" /> View in Backlinks
              </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {offer.status === "ANOMALY_CHECK" && offer.anomaly && (
          <Card className="rounded-2xl border-yellow-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-4" /> Verifying an anomaly — checking if this is temporary (3–7 days)
              </CardTitle>
              <CardDescription>
                {anomalyText[offer.anomaly.issue]} · detected <DateTime iso={offer.anomaly.detectedAt} /> · verification window ends{" "}
                {offer.anomaly.windowEndsAt}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-[13px] text-yellow-800 dark:text-yellow-200">
                <PauseCircle className="size-4 shrink-0" />
                Monitoring paused until the check finishes. If the problem clears, monitoring resumes; if not, the offer moves to a
                violation outcome.
              </div>
              {youDeliver && (
                <Callout variant="warning" title="Action needed">
                  Restore the link on {offer.deliveredUrl} before {offer.anomaly.windowEndsAt}.
                </Callout>
              )}
              <Button variant="outline" className="w-fit rounded-full" disabled={pending} onClick={() => run(() => rescanLink(offer.id), "Link is back — monitoring resumed")}>
                {pending && <Loader2 className="size-4 animate-spin" />} Scan again
              </Button>
            </CardContent>
          </Card>
        )}

        {offer.status === "VIOLATED_BANNED" && offer.violation && (
          <div role="alert" className="flex gap-3 rounded-2xl border border-red-600 bg-red-600/15 px-5 py-4 text-red-800 dark:text-red-300">
            <Ban className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium">Link removed — seller banned</span>
              <p className="text-[13px] opacity-90">{offer.violation.reason}</p>
              <p className="text-[13px] opacity-90">
                The link stayed gone for 7 days after we reported it, so {offer.direction === "received" ? "your" : "their"} account got 3 penalty points and is banned for 90 days. Decided <DateTime iso={offer.violation.decidedAt} />.
              </p>
            </div>
          </div>
        )}

        {offer.status === "VIOLATED_NO_BAN" && offer.violation && (
          <div className="flex gap-3 rounded-2xl border border-dashed border-amber-600/50 bg-amber-600/10 px-5 py-4 text-amber-900 dark:text-amber-200">
            <ServerCrash className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium">Site went down permanently — no ban</span>
              <p className="text-[13px] opacity-90">{offer.violation.reason}</p>
              <p className="text-[13px] opacity-90">
                No penalty: there is no sign it was on purpose. Decided <DateTime iso={offer.violation.decidedAt} />.
              </p>
            </div>
          </div>
        )}

        {offer.status === "COMPLETED" && !offer.deliveredUrl && <Callout title="Completed">This deal is done.</Callout>}
        {offer.status === "REJECTED" && <Callout variant="danger" title="Rejected">This offer was declined.</Callout>}
        {offer.status === "CANCELLED" && offer.violation?.kind === "partner_failed" ? (
          <div role="alert" className="flex gap-3 rounded-2xl border border-amber-600/40 bg-amber-600/10 px-5 py-4 text-amber-900 dark:text-amber-200">
            <OctagonAlert className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium">
                {offer.type === "abc" ? "Pool closed — a member didn't place their link in time" : `Swap cancelled — ${offer.counterpartyDomain} didn't place their link`}
              </span>
              <p className="text-[13px] opacity-90">
                {offer.violation.reason} {offer.violation.delivered === false ? "You no longer need to place your link." : "You can take your link down."} Decided <DateTime iso={offer.violation.decidedAt} />.
              </p>
            </div>
          </div>
        ) : (offer.status === "CANCELLED" || offer.status === "EXPIRED") && offer.violation?.userId ? (
          <div role="alert" className={cn("flex gap-3 rounded-2xl border px-5 py-4", offer.penalizedViewer ? "border-red-600/60 bg-red-600/10 text-red-800 dark:text-red-300" : "border-amber-600/40 bg-amber-600/10 text-amber-900 dark:text-amber-200")}>
            <OctagonAlert className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium">
                {offer.status === "EXPIRED" ? "Expired — 72 hours without an answer" : "Cancelled — 72 hours ran out"}
              </span>
              <p className="text-[13px] opacity-90">{offer.violation.reason}</p>
              <p className="text-[13px] opacity-90">
                {offer.penalizedViewer
                  ? `You got ${offer.violation.points} penalty point${(offer.violation.points ?? 0) > 1 ? "s" : ""}.${offer.violation.suspendedUntil ? ` You are banned until ${offer.violation.suspendedUntil}: no new offers or pools, deals in progress continue.` : ""}`
                  : `${offer.counterpartyDomain} got ${offer.violation.points} penalty point${(offer.violation.points ?? 0) > 1 ? "s" : ""}.`}{" "}
                Decided <DateTime iso={offer.violation.decidedAt} />.
              </p>
            </div>
          </div>
        ) : (
          <>
            {offer.status === "CANCELLED" && <Callout title="Cancelled">This offer was cancelled; nothing was paid.</Callout>}
            {offer.status === "EXPIRED" && <Callout title="Expired">{offer.counterpartyDomain} didn&apos;t respond in time. No link was placed and nothing was paid.</Callout>}
          </>
        )}

        {/* ---- what was ordered ---- */}
        {offer.brief && !(offer.status === "SENT" && offer.direction === "received") && <OrderCard offer={offer} />}
      </div>

      <div className="flex h-fit flex-col gap-4">
        <CounterpartyCard offer={offer} dr={counterpartyDr} />
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col">
              {[...offer.timeline].reverse().map((t, i, arr) => (
                <li key={`${t.status}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", i === 0 ? "bg-foreground ring-4 ring-foreground/15" : "bg-border")} />
                    {i < arr.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className={cn("flex flex-col gap-1", i < arr.length - 1 && "pb-4")}>
                    <OfferStatusBadge status={t.status} className="w-fit" />
                    <DateTime iso={t.at} className="text-xs text-muted-foreground tabular-nums" />
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- where it stands ---------- */

const stageStyle: Record<OfferStage, { accent: string; label: string }> = {
  action: { accent: "border-l-amber-500", label: "text-amber-700 dark:text-amber-400" },
  waiting: { accent: "border-l-sky-500", label: "text-sky-700 dark:text-sky-400" },
  live: { accent: "border-l-green-500", label: "text-green-700 dark:text-green-400" },
  closed: { accent: "border-l-border", label: "text-muted-foreground" },
};

/** The steps of an offer. Paid: Sent → Accepted → Paid → Live → Completed. Exchange and ABC skip the payment. We verify the link ourselves, so there is no "delivered, please verify" step. */
function stepsFor(o: Offer): { key: string; label: string }[] {
  const all = [
    { key: "sent", label: "Sent" },
    { key: "accepted", label: "Accepted" },
    { key: "paid", label: "Paid" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
  ];
  return o.type === "paid" ? all : all.filter((s) => s.key !== "paid");
}

/** Which step the offer reached, and whether it stopped early. */
function progressOf(o: Offer, steps: { key: string }[]): { index: number; stopped: boolean } {
  const at = (key: string) => Math.max(0, steps.findIndex((s) => s.key === key));
  switch (o.status) {
    case "SENT":
      return { index: at("sent"), stopped: false };
    case "ACCEPTED":
      return { index: at("accepted"), stopped: false };
    case "PAYMENT_RECEIVED":
      return { index: at("paid"), stopped: false };
    case "DELIVERED":
      return { index: at("paid"), stopped: false };
    case "ACTIVE_MONITORING":
    case "ANOMALY_CHECK":
      return { index: at("live"), stopped: false };
    case "COMPLETED":
      return { index: at("completed"), stopped: false };
    case "VIOLATED_BANNED":
    case "VIOLATED_NO_BAN":
      return { index: at("live"), stopped: true };
    case "CANCELLED":
      // Withdrawn after being accepted: it got as far as Accepted
      return { index: o.timeline.some((t) => t.status === "ACCEPTED") ? at("accepted") : at("sent"), stopped: true };
    default:
      // REJECTED / EXPIRED end before anything was placed
      return { index: at("sent"), stopped: true };
  }
}

function StandingHero({ offer, canCancel, onCancel, pending }: { offer: Offer; canCancel: boolean; onCancel: () => void; pending: boolean }) {
  const stage = offerStage(offer);
  const steps = stepsFor(offer);
  const { index, stopped } = progressOf(offer, steps);
  const sellerIsYou = offer.direction === "received";
  // Every offer is one link, hosted by the seller and pointing at the buyer — on Exchange and ABC too (each swap is two offers)
  const from = sellerIsYou ? offer.yourDomain : offer.counterpartyDomain;
  const to = sellerIsYou ? offer.counterpartyDomain : offer.yourDomain;

  return (
    <div className={cn("flex flex-col gap-5 rounded-2xl border border-l-4 bg-card p-5", stageStyle[stage].accent)}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("text-xs font-medium tracking-[0.06em] uppercase", stageStyle[stage].label)}>{stageMeta[stage].label}</span>
          <span className="text-xl font-medium tracking-tight">{nextStep(offer)}</span>
        </div>
        <div className="flex items-center gap-2">
          <OfferStatusBadge status={offer.status} live={isLiveLink(offer)} />
          {offer.direction === "sent" && offer.status === "SENT" && (
            <div className="flex flex-col items-end gap-1">
              <Button variant="outline" size="sm" className="rounded-full" disabled={!canCancel || pending} onClick={onCancel}>
                Cancel offer
              </Button>
              {offer.cooldownMinutesLeft > 0 && (
                <span className="text-[11px] text-muted-foreground">Available in {offer.cooldownMinutesLeft} min</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <ol className={cn("grid gap-1.5", steps.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {steps.map(({ key, label }, i) => {
          const done = i < index || (i === index && stage === "closed" && !stopped);
          const current = i === index && !done;
          return (
            <li key={key} className="flex flex-col gap-1.5">
              <span
                className={cn(
                  "h-1.5 rounded-full",
                  done ? "bg-foreground/70" : current ? (stopped ? "bg-red-500/70" : "bg-foreground") : "bg-muted",
                )}
              />
              <span className={cn("text-[11px]", done || current ? "text-foreground" : "text-muted-foreground")}>
                {label}
                {current && stopped && " · stopped"}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Link flow */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted/40 px-4 py-3 text-sm">
        <SiteLabel domain={from} className="font-medium" />
        <ArrowRight className="size-4 text-muted-foreground" />
        <SiteLabel domain={to} className="font-medium" />
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
          <MarketBadge market={offer.type} icon />
          {offer.direction === "received" ? "Received" : "Sent by you"} · <DateTime iso={offer.createdAt} />
        </span>
      </div>
    </div>
  );
}

function CounterpartyCard({ offer, dr }: { offer: Offer; dr: number }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Counterparty</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <SiteLabel domain={offer.counterpartyDomain} size={20} className="text-base font-medium" />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MiniStat label="DR" value={dr} />
        </div>
        <a
          href={`https://${offer.counterpartyDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
        >
          Visit site <ExternalLink className="size-3" />
        </a>
      </CardContent>
    </Card>
  );
}

function OwnerBlock({ owner }: { owner: NonNullable<Offer["counterpartyOwner"]> }) {
  return (
    <div className="flex flex-col gap-3 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-3">
        <SellerAvatar seller={owner} size={44} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-base font-medium">{owner.name}</span>
          {owner.email && <span className="text-xs break-all text-muted-foreground">{owner.email}</span>}
        </span>
      </span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Country" value={owner.country || "—"} />
        <MiniStat label="Member since" value={owner.memberSince} />
        <MiniStat label="Links placed" value={owner.deals} />
        <MiniStat label="Failed deals" value={owner.failedDeals} />
      </div>
    </div>
  );
}

function SiteFacts({ site, domain, owner }: { site: NonNullable<Offer["counterpartySite"]>; domain: string; owner?: Offer["counterpartyOwner"] }) {
  const timeZone = useTimeZone();
  return (
    <div className="my-2 flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
      {owner && <OwnerBlock owner={owner} />}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SiteLabel domain={domain} size={18} className="font-medium" />
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline-offset-2 hover:underline">
          Visit site <ExternalLink className="size-3" />
        </a>
      </span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="DR" value={site.dr} />
        <MiniStat label="Monthly traffic" value={displayTraffic(site.traffic)} />
        <MiniStat label="Spam score" value={`${site.spamScore}%`} />
        <MiniStat label="Language · country" value={`${site.language} · ${site.country}`} />
      </div>
      {site.niches.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {site.niches.map((n) => (
            <span key={n} className="rounded-full border px-2 py-0.5 text-xs">
              {n}
            </span>
          ))}
        </span>
      )}
      <span className="text-xs text-muted-foreground">Listed on Backlink Market since {new Date(site.listedAt).toLocaleDateString("en-US", { timeZone, year: "numeric", month: "short", day: "numeric" })}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg bg-muted/40 px-2.5 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function UrlLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-mono text-xs break-all underline-offset-2 hover:underline">
      {url.replace(/^https?:\/\//, "")}
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

/* ---------- the order ---------- */

const categoryStyle: Record<Category, { icon: LucideIcon; bar: string; chip: string }> = {
  guest_post: { icon: PenLine, bar: "bg-violet-500", chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  link_insertion: { icon: Link2, bar: "bg-sky-500", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  review: { icon: Star, bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  footer_link: { icon: PanelBottom, bar: "bg-teal-500", chip: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
};

function Field2({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="text-[15px] font-medium break-words">{children}</span>
      </span>
    </div>
  );
}

function BriefLine({ line, paid }: { line: OfferBriefLine; paid: boolean }) {
  const st = categoryStyle[line.category];
  const Icon = st.icon;
  return (
    <div className="overflow-hidden rounded-2xl border bg-background/40">
      <div className={cn("h-1", st.bar)} />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-10 place-items-center rounded-xl", st.chip)}>
            <Icon className="size-5" />
          </span>
          <span className="text-lg font-medium">{categoryLabels[line.category]}</span>
          {paid && (
            <span className="ml-auto flex flex-col items-end">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatUsd(line.total)}</span>
              {line.discountPct > 0 && <span className="text-xs text-green-700 dark:text-green-400">{line.discountPct}% off {formatUsd(line.price)}</span>}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {line.category === "review" ? (
            <>
              <Field2 icon={FileText} label="Product to review">
                {line.productInfo || "—"}
              </Field2>
              <Field2 icon={Tag} label="Access details">
                {line.accessDetails || "—"}
              </Field2>
            </>
          ) : (
            <>
              {line.sellerPage && (
                <Field2 icon={FileText} label="Placed on this page">
                  {line.sellerPage}
                </Field2>
              )}
              <Field2 icon={Link2} label="Link points to">
                {line.targetUrl || "—"}
              </Field2>
              <Field2 icon={Type} label="Anchor text">
                “{line.anchor ?? ""}”
              </Field2>
              {line.topic && (
                <Field2 icon={FileText} label="Article topic">
                  {line.topic}
                </Field2>
              )}
            </>
          )}
        </div>
        {line.extras.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Gift className="size-4 text-muted-foreground" />
              {line.extras.length} extra dofollow link{line.extras.length > 1 ? "s" : ""}
              {paid && <span className="ml-auto tabular-nums">+{formatUsd(line.extraFee)}</span>}
            </span>
            {line.extras.map((e, i) => (
              <span key={i} className="truncate pl-6 text-xs text-muted-foreground">
                {e.url} · “{e.anchor}”
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** The deal a confirmation is about: who, which links, what it costs — so nobody confirms blind. */
function DealSummary({ offer }: { offer: Offer }) {
  const seller = offer.direction === "received";
  const hostDomain = seller ? offer.yourDomain : offer.counterpartyDomain;
  const targetDomain = seller ? offer.counterpartyDomain : offer.yourDomain;
  const flows: { host: string; target: string; line: OfferBriefLine }[] = [
    ...(offer.brief ?? []).map((line) => ({ host: hostDomain, target: targetDomain, line })),
    ...(offer.reciprocalBrief ? [{ host: targetDomain, target: hostDomain, line: offer.reciprocalBrief }] : []),
  ];
  const owner = offer.counterpartyOwner;
  const paid = offer.type === "paid";
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
          {marketLabels[offer.type]} · #{offer.ref}
        </span>
        {paid && offer.amount ? <span className="text-base font-semibold tabular-nums">{formatUsd(offer.amount)}</span> : <span className="text-xs text-muted-foreground">Nothing is paid</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SiteLabel domain={offer.yourDomain} size={18} className="font-medium" />
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <SiteLabel domain={offer.counterpartyDomain} size={18} className="font-medium" />
      </div>
      {owner && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <SellerAvatar seller={owner} size={20} /> {owner.name}
          {owner.country ? ` · ${owner.country}` : ""} · member since {owner.memberSince}
        </span>
      )}
      {flows.map(({ host, target, line }, i) => (
        <div key={i} className="flex flex-col gap-1 rounded-lg border bg-card p-2.5">
          <span className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium">{categoryLabels[line.category]}</span>
            <span className="text-muted-foreground">·</span>
            <SiteLabel domain={host} size={14} /> <ArrowRight className="size-3 text-muted-foreground" /> <SiteLabel domain={target} size={14} />
          </span>
          {line.sellerPage && <span className="text-xs break-all text-muted-foreground">On {line.sellerPage}</span>}
          {line.targetUrl && <span className="text-xs break-all text-muted-foreground">To {line.targetUrl}</span>}
          {line.anchor && <span className="text-xs">Anchor “{line.anchor}”</span>}
          {paid && <span className="text-xs tabular-nums text-muted-foreground">{formatUsd(line.total)}</span>}
        </div>
      ))}
    </div>
  );
}

/** What was ordered — big and colourful, because it's the thing a seller decides on. */
function OrderCard({ offer, prominent, actions }: { offer: Offer; prominent?: boolean; actions?: React.ReactNode }) {
  const paid = offer.type === "paid";
  const seller = offer.direction === "received";
  const lines = offer.brief ?? [];
  // Exchange and ABC pay nothing: each offer is one link, hosted by the seller. In a swap the other offer is the link back.
  const other = offer.reciprocalBrief ? [offer.reciprocalBrief] : [];
  // Every domain is shown with its logo
  const them = <SiteLabel domain={offer.counterpartyDomain} size={22} className="inline-flex align-middle" />;
  const you = <SiteLabel domain={offer.yourDomain} size={22} className="inline-flex align-middle" />;
  const small = (d: string) => <SiteLabel domain={d} size={16} className="inline-flex align-middle" />;
  const groups: { label?: React.ReactNode; icon?: LucideIcon; tone?: string; lines: OfferBriefLine[] }[] = paid
    ? [{ lines }]
    : [
        {
          label: seller ? <span className="flex flex-wrap items-center gap-1.5">You place on {small(offer.yourDomain)}</span> : <span className="flex flex-wrap items-center gap-1.5">{small(offer.counterpartyDomain)} places on their site</span>,
          icon: seller ? ArrowUpRight : ArrowDownLeft,
          tone: seller ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300",
          lines,
        },
        ...(other.length
          ? [
              {
                label: seller ? <span className="flex flex-wrap items-center gap-1.5">You get on {small(offer.counterpartyDomain)}</span> : <span className="flex flex-wrap items-center gap-1.5">You place on {small(offer.yourDomain)}</span>,
                icon: seller ? ArrowDownLeft : ArrowUpRight,
                tone: seller ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300",
                lines: other,
              },
            ]
          : []),
      ];
  const title = paid ? (
    seller ? (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {them} wants {lines.length === 1 ? "a link" : `${lines.length} placements`} on {you}
      </span>
    ) : (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">What you asked {them} for</span>
    )
  ) : offer.type === "exchange" ? (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">Link swap with {them}</span>
  ) : seller ? (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">You link to {them} in this pool</span>
  ) : (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">{them} links to you in this pool</span>
  );
  return (
    <Card className={cn("rounded-2xl", prominent && "border-2 border-sky-500/40 shadow-lg shadow-sky-500/5")}>
      <CardHeader>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {prominent && <span className="text-xs font-medium tracking-[0.06em] text-sky-600 uppercase dark:text-sky-400">Decide on this {offer.type === "exchange" ? "swap" : "offer"}</span>}
            <CardTitle className="text-xl">{title}</CardTitle>
            {prominent && offer.counterpartySite && <SiteFacts site={offer.counterpartySite} domain={offer.counterpartyDomain} owner={offer.message ? undefined : offer.counterpartyOwner} />}
            <CardDescription>{paid ? "Priced from the seller's listing." : offer.type === "exchange" ? "One link each way — nothing is paid." : "Part of a three-way loop — nothing is paid."}</CardDescription>
          </div>
          {paid && offer.amount ? (
            <div className="flex flex-col items-end rounded-2xl bg-green-500/10 px-4 py-2 text-green-800 dark:text-green-300">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatUsd(offer.amount)}</span>
              <span className="text-xs">{seller ? "the buyer pays you directly" : "you pay them directly"}</span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-3">
            {g.label && g.icon && (
              <span className={cn("flex items-center gap-2 text-sm font-semibold", g.tone)}>
                <g.icon className="size-4" /> {g.label}
              </span>
            )}
            {g.lines.map((l) => (
              <BriefLine key={l.category + gi} line={l} paid={paid} />
            ))}
          </div>
        ))}
        {paid && lines.length > 1 && offer.amount ? (
          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold tabular-nums">{formatUsd(offer.amount)}</span>
          </div>
        ) : null}
        {actions}
      </CardContent>
    </Card>
  );
}

/* ---------- ABC: who gives to whom ---------- */

/**
 * An ABC pool is a loop of three sites: each one places a link on its own site for the next one, and the last for the
 * first. This shows the loop, then the two links that matter to you — the one you give and the one you get — so it is
 * never unclear who links to whom. Each of those is its own offer; this page is one of the two.
 */
function PoolLoopCard({ offer, pool }: { offer: Offer; pool: PoolContext }) {
  const mine = pool.seats.find((s) => s.mine);
  const n = pool.seats.length || 3;
  const next = mine ? pool.seats.find((s) => s.seat === (mine.seat % n) + 1) : undefined;
  const prev = mine ? pool.seats.find((s) => s.seat === ((mine.seat + n - 2) % n) + 1) : undefined;
  const isGive = offer.direction === "received"; // you're the seller = you host the link
  const row = (kind: "give" | "get") => {
    const link = kind === "give" ? pool.give : pool.get;
    const other = kind === "give" ? (link?.domain ?? next?.domain) : (link?.domain ?? prev?.domain);
    const here = (kind === "give") === isGive;
    const give = kind === "give";
    return (
      <div className={cn("flex flex-col gap-2 rounded-2xl border p-4", give ? "border-amber-500/30 bg-amber-500/5" : "border-green-600/30 bg-green-600/5", here && "ring-2 ring-foreground/20")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("grid size-8 place-items-center rounded-full", give ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-green-600/15 text-green-700 dark:text-green-300")}>
            {give ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
          </span>
          <span className="text-base font-medium">{give ? "You give a link" : "You get a link"}</span>
          {here ? (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">This offer</span>
          ) : link ? (
            <Link href={`/offers/${link.ref}`} className="rounded-full border px-2 py-0.5 text-[11px] font-medium hover:bg-muted">
              Open the other one →
            </Link>
          ) : null}
          {link && <OfferStatusBadge status={link.status} className="ml-auto" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
          {give ? (
            <>
              <SiteLabel domain={offer.yourDomain} size={18} className="font-medium" />
              <span className="text-muted-foreground">places a link on its site →</span>
              {other && <SiteLabel domain={other} size={18} className="font-medium" />}
            </>
          ) : (
            <>
              {other && <SiteLabel domain={other} size={18} className="font-medium" />}
              <span className="text-muted-foreground">places a link on its site →</span>
              <SiteLabel domain={offer.yourDomain} size={18} className="font-medium" />
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {give ? "You put it on your own site, pointing to their page." : "They put it on their own site, pointing to your page — you don't do anything for this one."}
        </span>
      </div>
    );
  };
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-xl">Your place in the pool</CardTitle>
          {pool.ref && (
            <Link href={`/markets/abc/${pool.ref}`} className="ml-auto text-xs font-medium underline-offset-2 hover:underline">
              Open the pool →
            </Link>
          )}
        </div>
        <CardDescription>Three sites, one loop: each places a link on its own site for the next one — nobody links straight back.</CardDescription>
      </CardHeader>
      <CardContent className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AbcCycle seats={roomSeats(pool.seats)} />
        <div className="flex flex-col gap-3">
          {row("give")}
          {row("get")}
        </div>
      </CardContent>
    </Card>
  );
}
