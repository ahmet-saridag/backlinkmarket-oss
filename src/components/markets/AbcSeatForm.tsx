"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { joinPool, leavePool, setPoolLink } from "@/app/(app)/markets/abc/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Field } from "@/components/shared/Field";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { useIsSuspended } from "@/components/standing/standing";
import { toast } from "@/lib/toast";
import type { UserSite } from "@/lib/types";

/**
 * Joins the given pool with a site you pick. The link you want is a page on your own site plus its anchor text.
 */
export function AbcSeatForm({
  sites,
  roomId,
  submitLabel,
  blocked = {},
}: {
  sites: UserSite[];
  roomId: string;
  submitLabel: string;
  /** Sites that can't take a seat here, with the reason (already in this room / in 10 pools) */
  blocked?: Record<string, string>;
}) {
  const router = useRouter();
  const suspended = useIsSuspended();
  const [pending, startTransition] = useTransition();
  const free = sites.filter((s) => !blocked[s.id]);
  const blockedSites = sites.filter((s) => blocked[s.id]);
  const [siteId, setSiteId] = useState<string | null>(free.length === 1 ? free[0].id : null);
  const site = sites.find((s) => s.id === siteId) ?? null;
  const [targetUrl, setTargetUrl] = useState("");
  const [anchor, setAnchor] = useState("");
  const [confirming, setConfirming] = useState(false);

  const submit = () =>
    startTransition(async () => {
      const result = await joinPool({ roomId, siteId, targetUrl, anchor });
      setConfirming(false);
      if (!result.ok) {
        toast.error(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Something went wrong.");
        return;
      }
      toast.success(result.locked ? "Pool locked — your link is in Offers" : "You're in — waiting for the pool to fill");
      if (result.locked) router.push("/offers");
      router.refresh();
    });

  if (free.length === 0) {
    return (
      <ul className="flex flex-col gap-1 text-[13px] text-muted-foreground">
        {blockedSites.map((s) => (
          <li key={s.id}>
            {s.domain} — {blocked[s.id]}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <Field label="Your site">
          <SimpleSelect
            value={siteId}
            onChange={setSiteId}
            placeholder="Pick a site"
            options={free.map((s) => ({ value: s.id, label: `${s.domain} · DR ${s.dr}` }))}
          />
        </Field>
        <Field label="Page the link should point to">
          <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder={site ? `https://${site.domain}/…` : "https://…"} />
        </Field>
        <Field label="Anchor text">
          <Input value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder="e.g. technical SEO checklist" />
        </Field>
      </div>
      {blockedSites.length > 0 && (
        <p className="text-xs text-muted-foreground">Not available: {blockedSites.map((s) => `${s.domain} (${blocked[s.id]})`).join(", ")}.</p>
      )}
      <Button className="w-fit rounded-full" disabled={!site || !targetUrl.trim() || !anchor.trim() || suspended || pending} onClick={() => setConfirming(true)}>
        {pending && <Loader2 className="size-4 animate-spin" />} {submitLabel}
      </Button>
      <ConfirmDialog
        request={
          confirming
            ? {
                title: "Take this seat?",
                description: `${site?.domain ?? "Your site"} joins the pool. When the third seat fills, the room locks and you have 72 hours to place your link — you can leave until then.`,
                confirmLabel: "Take the seat",
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

/** Your own seat: which page of your site the link points to, and its anchor. Editable until the pool locks. */
export function AbcLinkForm({ roomId, siteId, domain, initial }: { roomId: string; siteId: string; domain: string; initial: { targetUrl: string; anchor: string } | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [targetUrl, setTargetUrl] = useState(initial?.targetUrl ?? `https://${domain}/`);
  const [anchor, setAnchor] = useState(initial?.anchor ?? "");
  const save = () =>
    startTransition(async () => {
      const result = await setPoolLink({ roomId, siteId, targetUrl, anchor });
      if (result.ok) {
        toast.success("Link saved");
        router.refresh();
      } else toast.error(result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Something went wrong.");
    });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Page the link should point to">
        <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder={`https://${domain}/…`} />
      </Field>
      <Field label="Anchor text">
        <Input value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder="e.g. technical SEO checklist" />
      </Field>
      <Button className="w-fit rounded-full" disabled={!targetUrl.trim() || !anchor.trim() || pending} onClick={save}>
        {pending && <Loader2 className="size-4 animate-spin" />} Save link
      </Button>
    </div>
  );
}

export function AbcLeaveButton({ roomId, siteId, domain }: { roomId: string; siteId: string; domain: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-fit rounded-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await leavePool(roomId, siteId);
          if (!result.ok) return void toast.error(result.error ?? "Something went wrong.");
          toast.success(`${domain} left the pool`);
          router.push("/markets/abc");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />} Take {domain} out
    </Button>
  );
}
