"use client";

import { OctagonAlert } from "lucide-react";
import { AccountSection } from "@/components/account/AccountSection";
import { formatDate, useAccountStanding } from "@/components/standing/standing";
import { penaltyRules, violationLabels } from "@/lib/standing-rules";
import { cn } from "@/lib/utils";

export function TrustStandingSection() {
  const s = useAccountStanding();
  const suspended = s.suspendedUntil !== null;
  const points = Math.min(s.penaltyPoints, s.maxPoints);

  return (
    <AccountSection
      id="standing"
      title="Trust & Standing"
      description={`Penalty points count within a monthly window. ${s.maxPoints} points suspend the account.`}
    >
      {suspended && s.suspendedUntil && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-4 text-red-800 dark:text-red-300"
        >
          <OctagonAlert className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-base font-medium">Banned until {formatDate(s.suspendedUntil)}</span>
            <span className="text-[13px] opacity-90">
              You reached {s.maxPoints}/{s.maxPoints} penalty points. You can&apos;t create offers or join pools until then;
              deals already in progress continue.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Penalty points</span>
          <span className={cn("text-xl font-[450] tabular-nums", suspended && "text-red-700 dark:text-red-400")}>
            {points}/{s.maxPoints}
          </span>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: s.maxPoints }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < points ? (suspended ? "bg-red-500" : "bg-amber-500") : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">Last reset</span>
          <span className="text-sm">{formatDate(s.windowStartedAt)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">Next reset</span>
          <span className="text-sm">{formatDate(s.windowResetsAt)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">This window</span>
        {s.violations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No violations. Keep it up.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {s.violations.map((v) => (
              <li key={v.id} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex-1 text-sm">{violationLabels[v.type]}</span>
                <span className="font-mono text-xs text-muted-foreground">{v.offerId}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{v.date}</span>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    v.points >= s.maxPoints ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400",
                  )}
                >
                  +{v.points} pt{v.points > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="rounded-xl border px-4 py-3 text-[13px]">
        <summary className="cursor-pointer text-muted-foreground">How penalty points work</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
          {(["seller_no_response_72h", "buyer_payment_not_sent", "seller_no_delivery_72h", "one_sided_delivery"] as const).map(
            (t) => (
              <li key={t}>
                {violationLabels[t]} — {penaltyRules.pointsPerViolation} point
              </li>
            ),
          )}
          <li>
            {violationLabels.delivery_rejected} — {penaltyRules.deliveryRejectedPoints} points at once, immediate suspension
          </li>
          <li>
            {violationLabels.link_removed} — {penaltyRules.linkRemovedPoints} points at once, immediate suspension
          </li>
          <li>
            Reaching {penaltyRules.suspensionThreshold} points suspends the account for 3 months ({penaltyRules.suspensionDays} days).
          </li>
        </ul>
      </details>
    </AccountSection>
  );
}
