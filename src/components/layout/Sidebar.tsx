"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  CreditCard,
  Globe,
  Handshake,
  LayoutDashboard,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Store,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppData } from "@/components/layout/app-data";
import { SponsorCard } from "@/components/layout/SponsorCard";
import { Logo } from "@/components/brand/Logo";
import { needsAction } from "@/lib/offer-actions";
import type { Offer } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export const coreNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Markets",
    href: "/markets",
    icon: Store,
    children: [
      { label: "Paid Market", href: "/markets/paid", icon: Wallet },
      { label: "Exchange", href: "/markets/exchange", icon: ArrowLeftRight },
      { label: "ABC (Pool)", href: "/markets/abc", icon: Users },
    ],
  },
  { label: "Offers", href: "/offers", icon: Handshake },
  { label: "Backlinks", href: "/backlinks", icon: Link2 },
];

export const otherNav: NavItem[] = [
  { label: "My Sites", href: "/sites", icon: Globe },
  { label: "Payment History", href: "/payment-history", icon: CreditCard },
  { label: "Logs", href: "/logs", icon: ScrollText },
  { label: "Account", href: "/account", icon: User },
];

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const ENDED = new Set<Offer["status"]>(["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED", "VIOLATED_BANNED", "VIOLATED_NO_BAN"]);

/** Small counts next to nav items: what needs you, or how many you have. */
function useNavCounts(): Record<string, { value: number; alert?: boolean; info?: boolean }> {
  const { offers, backlinks, sites } = useAppData();
  return {
    // Every offer that is still open — not completed, declined, cancelled or expired. Amber when one needs you.
    "/offers": { value: offers.filter((o) => !ENDED.has(o.status)).length, alert: offers.some(needsAction), info: true },
    "/backlinks": { value: backlinks.filter((x) => x.status === "active").length },
    "/sites": { value: sites.length },
  };
}

function CountBadge({ value, alert, info, active }: { value: number; alert?: boolean; info?: boolean; active?: boolean }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-5 rounded-full px-1.5 py-px text-center text-[10px] font-medium tabular-nums",
        active
          ? "bg-background/20 text-background"
          : alert
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : info
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
              : "bg-foreground/[0.06] text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

function NavLink({ item, pathname, onNavigate, nested, collapsed, count }: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
  collapsed?: boolean;
  count?: { value: number; alert?: boolean; info?: boolean };
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const className = cn(
    "relative flex items-center gap-2.5 rounded-full px-3 py-1.5 text-[13px] transition-colors",
    nested && !collapsed && "py-1.5 text-[12.5px]",
    collapsed && "size-9 justify-center px-0 py-0",
    active
      ? "bg-foreground font-medium text-background shadow-sm"
      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={className}
            />
          }
        >
          <Icon className="size-4 shrink-0" />
          {count?.alert && count.value > 0 && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500 ring-2 ring-sidebar" aria-hidden />
          )}
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
          {count?.value ? ` · ${count.value}` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}>
      <Icon className="size-4 shrink-0" />
      {item.label}
      {count && <CountBadge value={count.value} alert={count.alert} info={count.info} active={active} />}
    </Link>
  );
}

function NavGroup({ item, pathname, onNavigate }: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;
  const childActive = isActive(pathname, item.href);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
          childActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {item.label}
        <ChevronDown className={cn("ml-auto size-3.5 transition-transform", !open && "-rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l pl-2">
          {item.children!.map((child) => (
            <NavLink key={child.href} item={child} pathname={pathname} onNavigate={onNavigate} nested />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Section({ title, items, pathname, onNavigate, collapsed }: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const counts = useNavCounts();
  if (collapsed) {
    // Icon-only rail: group children are shown flat so every page stays one click away.
    const flat = items.flatMap((item) => item.children ?? [item]);
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="sr-only">{title}</span>
        {flat.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} collapsed count={counts[item.href]} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-3 pb-2.5 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{title}</div>
      {items.map((item) =>
        item.children ? (
          <NavGroup key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} count={counts[item.href]} />
        ),
      )}
    </div>
  );
}

/**
 * Sidebar content — a floating rounded panel on desktop (expanded or icon-only) and the mobile sheet.
 * `onToggleCollapsed` shows the collapse button in the panel's top-right (desktop only).
 */
export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  className,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const toggle = onToggleCollapsed && (
    <button
      type="button"
      onClick={onToggleCollapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="grid size-7 shrink-0 place-items-center rounded-full border bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
    >
      {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
    </button>
  );
  return (
    <div className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className={cn("flex shrink-0 items-center gap-2", collapsed ? "flex-col gap-3 pt-3 pb-1" : "h-14 pr-2.5 pl-3.5")}>
        {/* The icon rail keeps only the expand button — no logo */}
        {!collapsed && (
          <Link
            href="/dashboard"
            onClick={onNavigate}
            aria-label="Backlink Market"
            className="flex min-w-0 items-center"
          >
            <Logo size={28} />
          </Link>
        )}
        {!collapsed && <span className="flex-1" />}
        {toggle}
      </div>
      <nav className={cn("flex flex-1 flex-col overflow-x-hidden overflow-y-auto pt-2 pb-6", collapsed ? "gap-3 px-2" : "gap-5 px-2.5")}>
        <Section title="Core" items={coreNav} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        {collapsed && <div className="mx-auto h-px w-6 bg-border" />}
        <Section title="Workspace" items={otherNav} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
      </nav>
      <div className={cn("shrink-0 pb-3", collapsed ? "px-2" : "px-2.5")}>
        <SponsorCard collapsed={collapsed} />
      </div>
    </div>
  );
}
