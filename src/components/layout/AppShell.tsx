"use client";

import { useState, useSyncExternalStore } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LivePulse } from "@/components/layout/LivePulse";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AvatarMirror } from "@/components/account/AvatarMirror";
import { SuspendedBanner } from "@/components/standing/SuspendedBanner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sidebar-collapsed";

// Collapsed preference lives in localStorage (per browser). Falls back to memory when storage is blocked.
let memoryCollapsed = false;
const listeners = new Set<() => void>();

function readCollapsed() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? memoryCollapsed : v === "1";
  } catch {
    return memoryCollapsed;
  }
}

function writeCollapsed(value: boolean) {
  memoryCollapsed = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Desktop: fixed sidebar, a floating panel, 240px expanded or a 76px icon-only rail (remembered per browser).
 * Below `lg`: hamburger + sheet. Wrap any app page with it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Server render is always expanded; the saved preference applies after hydration.
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  // Animate only on user toggles, not when the saved preference kicks in after hydration.
  const [animate, setAnimate] = useState(false);
  const toggleCollapsed = () => {
    setAnimate(true);
    writeCollapsed(!collapsed);
  };

  return (
    <div className="flex min-h-full flex-1">
      {/* Floating panel: inset from the viewport edges, rounded, with its own border */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden p-3 lg:block",
          animate && "transition-[width] duration-200",
          collapsed ? "w-[76px]" : "w-[240px]",
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} className="overflow-hidden rounded-2xl border shadow-sm" />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[240px] gap-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          animate && "transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[240px]",
        )}
      >
        <Header onMenuClick={() => setMobileOpen(true)} />
        <AvatarMirror />
        <LivePulse />
        <SuspendedBanner />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
