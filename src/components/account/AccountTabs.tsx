"use client";

import { useState } from "react";
import { Banknote, Bell, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "payments", label: "Payout", icon: Banknote },
  { id: "standing", label: "Trust & standing", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabId = (typeof tabs)[number]["id"];

/** Account sections as tabs: the menu on the left picks the one panel shown on the right. */
export function AccountTabs({ panels }: { panels: Record<TabId, React.ReactNode> }) {
  const [tab, setTab] = useState<TabId>("profile");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
      <nav aria-label="Account sections">
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0" role="tablist">
          {tabs.map(({ id, label, icon: Icon }) => (
            <li key={id} className="shrink-0">
              <button
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] whitespace-nowrap transition-colors",
                  tab === id ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div role="tabpanel" className="min-w-0">
        {panels[tab]}
      </div>
    </div>
  );
}
