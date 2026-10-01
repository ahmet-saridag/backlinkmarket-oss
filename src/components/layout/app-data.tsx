"use client";

import { createContext, useContext } from "react";
import type { AccountStanding, Backlink, NotificationItem, Offer, UserSite } from "@/lib/types";

/** The signed-in user's real data, loaded once by the (app) layout and shared by the shell (sidebar, header, dialogs). */
export interface AppData {
  sites: UserSite[];
  offers: Offer[];
  backlinks: Backlink[];
  notifications: NotificationItem[];
  standing: AccountStanding;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ data, children }: { data: AppData; children: React.ReactNode }) {
  return <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const data = useContext(AppDataContext);
  if (!data) throw new Error("useAppData must be used inside <AppDataProvider>");
  return data;
}
