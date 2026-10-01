"use client";

import Link from "next/link";
import { OctagonAlert } from "lucide-react";
import { formatDate, useAccountStanding } from "@/components/standing/standing";

export function SuspendedBanner() {
  const standing = useAccountStanding();
  if (!standing.suspendedUntil) return null;
  return (
    <div role="alert" className="mx-3 mt-3 lg:ml-0 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm text-red-800 dark:text-red-300">
      <OctagonAlert className="size-4 shrink-0" />
      <span className="flex-1">
        <strong className="font-medium">You are banned until {formatDate(standing.suspendedUntil)}.</strong>{" "}
        You canYou can&apos;t create new offers; running deals continue.apos;t create new offers or join pools; running deals continue.
      </span>
      <Link href="/account#standing" className="shrink-0 underline underline-offset-2">
        Details
      </Link>
    </div>
  );
}
