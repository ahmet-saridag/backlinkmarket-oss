"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Callout } from "@/components/shared/Callout";
import { OfferStatusBadge } from "@/components/shared/OfferStatusBadge";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { marketLabels } from "@/lib/labels";
import { useAppData } from "@/components/layout/app-data";
import { sitePauseState } from "@/lib/site-rules";
import type { UserSite } from "@/lib/types";

/**
 * Pause: hides the site from every market until resumed; settings are kept.
 * Blocked while a deal is running (payment already sent or a live link); pending offers get cancelled.
 * Resume: lists the site again in its markets.
 */
export function PauseSiteDialog({
  site,
  mode,
  open,
  onOpenChange,
  onConfirm,
}: {
  site: UserSite;
  mode: "pause" | "resume";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { offers } = useAppData();
  const state = mode === "pause" ? sitePauseState(site, offers) : { kind: "free" as const };
  const markets = site.markets.map((m) => marketLabels[m]).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "resume"
              ? `Resume ${site.domain}?`
              : state.kind === "blocked"
                ? `${site.domain} can't be paused`
                : `Pause ${site.domain}?`}
          </DialogTitle>
          <DialogDescription>
            {mode === "resume"
              ? `It's listed again in ${markets} and can receive new offers right away.`
              : state.kind === "blocked"
                ? "This site has deals in progress (payment already sent or a live link). Finish or resolve them first — pausing now would leave the other side stranded:"
                : `It's hidden from ${markets} and can't receive new offers until you resume it. Your prices, terms and slots are kept.`}
          </DialogDescription>
        </DialogHeader>

        {state.kind !== "free" && (
          <ul className="min-w-0 divide-y overflow-hidden rounded-xl border text-sm">
            {state.offers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link href={`/offers/${o.ref}`} className="font-mono text-xs hover:underline">
                  {o.ref}
                </Link>
                <SiteLabel domain={o.counterpartyDomain} className="min-w-0 flex-1" />
                <OfferStatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        )}
        {state.kind === "cancels" && (
          <Callout variant="warning">
            {state.offers.length === 1 ? "This pending offer" : `These ${state.offers.length} pending offers`} will be
            cancelled automatically and the other side will be notified.
          </Callout>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="rounded-full" />}>
            {state.kind === "blocked" ? "Close" : "Cancel"}
          </DialogClose>
          {state.kind !== "blocked" && (
            <Button className="rounded-full" onClick={onConfirm}>
              {mode === "resume" ? "Resume site" : state.kind === "cancels" ? "Cancel offers & pause" : "Pause site"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
