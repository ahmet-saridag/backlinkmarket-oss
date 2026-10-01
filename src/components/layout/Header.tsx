"use client";

import Link from "next/link";
import { BadgeCheck, LogOut, Menu, User } from "lucide-react";
import { useUser } from "@/components/account/user-context";
import { UserAvatar } from "@/components/account/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonitoringIndicator } from "@/components/backlinks/monitoring";
import { SitesDrIndicator } from "@/components/sites/SitesDrIndicator";
import { useAppData } from "@/components/layout/app-data";
import { NotificationsMenu } from "@/components/layout/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useUser();
  const { notifications } = useAppData();
  return (
    // Pairs with the floating sidebar: same inset, surface and radius, but no border or shadow so it stays light.
    // Not sticky.
    <div className="px-3 pt-3 lg:pl-0">
      <header className="flex h-14 items-center gap-2 rounded-2xl bg-sidebar px-3 text-sidebar-foreground md:px-4">
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Open menu" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
        {/* Left: what you're tracking — site DR and link monitoring */}
        <div className="flex min-w-0 items-center gap-1.5">
          <SitesDrIndicator />
          <MonitoringIndicator />
        </div>

        {/* Right: app controls */}
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />

          <NotificationsMenu items={notifications} />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="size-10 rounded-full" aria-label="Account menu" />}
            >
              <span className="relative flex">
                <UserAvatar size={36} />
                {/* Every account is verified; show it without opening the menu */}
                <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-background ring-2 ring-background">
                  <BadgeCheck className="size-4 text-sky-500" aria-label="Verified" />
                </span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-3 py-2">
                  <UserAvatar size={40} />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                      {user.displayName}
                      <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-label="Verified" />
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Verified · {user.plan}
                    </span>
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/account" />}>
                <User className="size-4" /> Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await createClient().auth.signOut();
                  window.location.href = "/";
                }}
              >
                <LogOut className="size-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
