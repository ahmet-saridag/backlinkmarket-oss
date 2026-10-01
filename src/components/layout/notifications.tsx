"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  BellOff,
  BadgeCheck,
  CircleCheck,
  DollarSign,
  Gavel,
  Hourglass,
  OctagonAlert,
  Inbox,
  Link2Off,
  Users,
  Banknote,
  Undo2,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/app/(app)/account/actions";
import { MarketBadge } from "@/components/shared/MarketBadge";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationKind } from "@/lib/types";

/** Icon + tone per kind: green = good news, amber = needs you, violet = resolved for you, neutral = info. */
export const notificationKinds: Record<NotificationKind, { icon: LucideIcon; tone: string; group: "offers" | "links" | "money" }> = {
  offer_accepted: { icon: CircleCheck, tone: "bg-green-500/15 text-green-700 dark:text-green-400", group: "offers" },
  offer_received: { icon: Inbox, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-400", group: "offers" },
  exchange_match: { icon: ArrowLeftRight, tone: "bg-teal-500/15 text-teal-700 dark:text-teal-400", group: "offers" },
  abc_room: { icon: Users, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-400", group: "offers" },
  payment_received: { icon: DollarSign, tone: "bg-green-500/15 text-green-700 dark:text-green-400", group: "money" },
  payout_released: { icon: Wallet, tone: "bg-green-500/15 text-green-700 dark:text-green-400", group: "money" },
  link_verified: { icon: BadgeCheck, tone: "bg-green-500/15 text-green-700 dark:text-green-400", group: "links" },
  link_missing: { icon: Link2Off, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400", group: "links" },
  partner_penalized: { icon: Gavel, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-400", group: "links" },
  penalty: { icon: OctagonAlert, tone: "bg-red-500/15 text-red-700 dark:text-red-400", group: "links" },
  offer_expired: { icon: Hourglass, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400", group: "offers" },
  offer_declined: { icon: XCircle, tone: "bg-red-500/15 text-red-700 dark:text-red-400", group: "offers" },
  offer_withdrawn: { icon: Undo2, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400", group: "offers" },
  payment_sent: { icon: Banknote, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400", group: "money" },
};

/** One notification: kind icon, title, one line of context, then site · market · time. */
export function NotificationRow({
  n,
  unread,
  onOpen,
  className,
}: {
  n: NotificationItem;
  unread: boolean;
  onOpen?: () => void;
  className?: string;
}) {
  const { icon: Icon, tone } = notificationKinds[n.kind];
  const body = (
    <>
      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", tone)}>
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[13px] leading-snug", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
          {n.title}
        </span>
        {n.detail && <span className="text-xs leading-snug text-muted-foreground">{n.detail}</span>}
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {n.domain && <SiteLabel domain={n.domain} size={12} className="max-w-40 text-foreground/80" />}
          {n.market && <MarketBadge market={n.market} icon className="h-4 px-1.5 text-[10px]" />}
          <span>{n.time}</span>
        </span>
      </span>
      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-sky-500" aria-label="Unread" />}
    </>
  );
  const cls = cn("flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-foreground/[0.04]", className);
  return n.href ? (
    <Link href={n.href} onClick={onOpen} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

type Filter = "all" | "offers" | "links" | "money";
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "offers", label: "Offers" },
  { value: "links", label: "Links" },
  { value: "money", label: "Payments" },
];

/**
 * Header notifications: grouped into New / Earlier, filterable by what they're about, each with
 * context and a link to where you act. Read state is kept in this browser.
 */
export function NotificationsMenu({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  // Opening the bell reads everything (and the account remembers it). `readAt` covers this session until the
  // server's copy comes back with the next render; `fresh` keeps what was new visible while the menu is open.
  const [readAt, setReadAt] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());

  const isUnread = (n: NotificationItem) => !n.read && (readAt === null || n.at > readAt);
  const unreadCount = items.filter(isUnread).length;
  const shown = items.filter((n) => filter === "all" || notificationKinds[n.kind].group === filter);
  const fresh = shown.filter((n) => freshIds.has(n.id));
  const earlier = shown.filter((n) => !freshIds.has(n.id));
  const countFor = (f: Filter) => items.filter((n) => freshIds.has(n.id) && (f === "all" || notificationKinds[n.kind].group === f)).length;

  const readAll = () => {
    setReadAt(new Date().toISOString());
    void markNotificationsRead();
  };
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFreshIds(new Set(items.filter(isUnread).map((n) => n.id)));
      if (unreadCount > 0) readAll();
    } else {
      setFreshIds(new Set());
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={`${unreadCount} new notifications`} />
        }
      >
        {/* Badge is anchored to the bell's top-right corner so it never covers the icon */}
        <span className="relative flex">
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-[3px] text-[9px] leading-none font-semibold text-white ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {freshIds.size > 0 && (
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-700 tabular-nums dark:text-sky-400">
              {freshIds.size} new
            </span>
          )}
        </div>

        {/* Filters */}
        {items.length > 0 && (
          <div className="flex gap-1 border-b px-2 py-2" role="tablist" aria-label="Filter notifications">
            {filters.map((f) => {
              const on = filter === f.value;
              const c = countFor(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
                    on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                  )}
                >
                  {f.label}
                  {c > 0 && <span className={cn("tabular-nums", on ? "opacity-70" : "text-sky-600 dark:text-sky-400")}>{c}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="max-h-[440px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <BellOff className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">No notifications yet</span>
              <span className="text-xs text-muted-foreground">Offer updates, deliveries, link checks and payouts will show up here.</span>
            </div>
          ) : shown.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">Nothing here yet.</p>
          ) : (
            <>
              {fresh.length > 0 && <GroupLabel>New</GroupLabel>}
              {fresh.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  unread
                  onOpen={() => setOpen(false)}
                />
              ))}
              {earlier.length > 0 && <GroupLabel>Earlier</GroupLabel>}
              {earlier.map((n) => (
                <NotificationRow key={n.id} n={n} unread={false} onOpen={() => setOpen(false)} />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
          <Link href="/account" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            Notification settings
          </Link>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-1 font-medium hover:underline">
            Open dashboard <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pt-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{children}</div>;
}
