"use client";

import { createContext, useContext, useState } from "react";

export type SessionUser = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  email: string | null;
  plan: string;
  payoutConnected: boolean;
  /** IANA zone from the account settings; every time on screen is shown in it */
  timezone: string | null;
};

type UserContextValue = { user: SessionUser; setAvatarUrl: (url: string | null) => void; setTimezone: (zone: string) => void };

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  // The zone you just saved applies at once; when the layout re-renders with the stored one it takes over again
  const [zone, setZone] = useState<{ from: string | null; value: string | null }>({ from: user.timezone, value: user.timezone });
  const timezone = zone.from === user.timezone ? zone.value : user.timezone;
  const setTimezone = (value: string) => setZone({ from: user.timezone, value });
  return <UserContext.Provider value={{ user: { ...user, avatarUrl, timezone }, setAvatarUrl, setTimezone }}>{children}</UserContext.Provider>;
}

function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

/** The signed-in user, loaded from their profile row by the (app) layout. */
export const useUser = () => useUserContext().user;

/** The viewer's time zone: their account's, or undefined (the browser's) when signed out or not set. */
export const useTimeZone = () => useContext(UserContext)?.user.timezone ?? undefined;

/** Applies a just-saved time zone everywhere (every time on screen follows it). */
export const useSetTimezone = () => useContext(UserContext)?.setTimezone ?? (() => {});

/** Updates the photo everywhere (header, account page) after an upload or removal. */
export const useSetAvatarUrl = () => useUserContext().setAvatarUrl;
