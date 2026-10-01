"use client";

import { useAppData } from "@/components/layout/app-data";
import type { AccountStanding } from "@/lib/types";

export const useAccountStanding = (): AccountStanding => useAppData().standing;

export const useIsSuspended = () => useAccountStanding().suspendedUntil !== null;

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
