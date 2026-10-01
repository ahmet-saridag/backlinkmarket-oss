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
import { useAppData } from "@/components/layout/app-data";
import { siteDeleteState } from "@/lib/site-rules";
import type { UserSite } from "@/lib/types";
import { SiteLabel } from "@/components/shared/SiteFavicon";

/**
 * Delete = soft delete (archive). Blocked while payment has been sent or a link is live;
 * pending offers without money/delivery are auto-cancelled.
 */
export function DeleteSiteDialog({
  site,
  onOpenChange,
  onDeleted,
}: {
  site: UserSite | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (site: UserSite) => void;
}) {
  const { offers } = useAppData();
  const state = site ? siteDeleteState(site, offers) : null;

  return (
    <Dialog open={site !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {site && state && (
          <>
            <DialogHeader>
              <DialogTitle>
                {state.kind === "blocked" ? `${site.domain} can't be deleted` : `Delete ${site.domain}?`}
              </DialogTitle>
              <DialogDescription>
                {state.kind === "blocked"
                  ? "Deleting now would break a deal that has payment sent or a live link. Finish or resolve these first:"
                  : "The site is archived, not erased: past deals, payments and dispute history stay on record. It disappears from all active lists."}
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
                <Button variant="destructive" className="rounded-full" onClick={() => onDeleted(site)}>
                  {state.kind === "cancels" ? "Cancel offers & delete" : "Delete site"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
