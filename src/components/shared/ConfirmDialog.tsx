"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ConfirmRequest {
  title: string;
  description: React.ReactNode;
  /** The deal in question — domains, links, price — shown above the buttons */
  summary?: React.ReactNode;
  confirmLabel: string;
  /** Red for things that can't be undone */
  tone?: "danger" | "default";
  /** Starts the action. The dialog stays open, showing a spinner, until the caller closes it (when `pending` ends). */
  onConfirm: () => void;
}

/** "Are you sure?" before an action that changes an offer — nothing happens until it's confirmed, and it shows progress after. */
export function ConfirmDialog({ request, pending, onClose }: { request: ConfirmRequest | null; pending?: boolean; onClose: () => void }) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>{request?.description}</DialogDescription>
        </DialogHeader>
        {request?.summary}
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={onClose} disabled={pending}>
            Go back
          </Button>
          <Button variant={request?.tone === "danger" ? "destructive" : "default"} className="rounded-full" disabled={pending} onClick={() => request?.onConfirm()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Working…" : request?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
