import { penaltyRules } from "@/lib/standing-rules";
import type { Backlink } from "@/lib/types";

/**
 * What happens when a monitored link disappears — the platform handles it, no dispute needed:
 *
 *   1. A scan finds the link gone          → both sides are told, the remover is warned
 *   2. 7-day window to put it back         → if restored, nothing else happens
 *   3. Deadline passes, still missing      → the remover gets a penalty point
 *   4. Outcome                             → Paid: no refund — there's no escrow, the buyer paid the seller directly
 *                                            Exchange / ABC: the other side may remove their link too
 */
export const RESTORE_DAYS = 7;

export type MissingStage = "waiting" | "penalized";

export interface MissingStep {
  label: string;
  detail?: string;
  date?: string;
  state: "done" | "current" | "upcoming";
}

export interface MissingCase {
  stage: MissingStage;
  /** Who took the link down: the partner (a link you received) or you (a link you gave) */
  remover: "partner" | "you";
  detectedAt: string;
  deadline: string;
  daysLeft: number;
  /** Badge text, e.g. "Missing · 3 days left" or "Partner penalized" */
  badge: string;
  /** One sentence for tables and the header list */
  summary: string;
  steps: MissingStep[];
  /** Received Exchange/ABC after the deadline: we tell you to take your own link down (detected automatically) */
  canRemoveYours: boolean;
}

const DAY = 86_400_000;
const toDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(toDate(d).getTime() + n * DAY).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY);

const partnerOf = (b: Backlink) => (b.direction === "given" ? b.targetDomain : b.sourceDomain);

export function missingCase(b: Backlink): MissingCase | null {
  if (b.live || b.status !== "active") return null;

  const detectedAt = b.missingSince ?? b.lastScan.slice(0, 10);
  const deadline = addDays(detectedAt, RESTORE_DAYS);
  const daysLeft = Math.max(0, daysBetween(new Date().toISOString().slice(0, 10), deadline));
  const stage: MissingStage = b.penalty ? "penalized" : "waiting";
  const remover = b.direction === "received" ? "partner" : "you";
  const partner = partnerOf(b);
  const paid = b.market === "paid";
  const points = b.penalty?.points ?? penaltyRules.pointsPerViolation;
  const left = `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;

  const done = stage === "penalized";
  const steps: MissingStep[] =
    remover === "partner"
      ? [
          { label: "Link not found on their page", date: detectedAt, state: "done" },
          {
            label: paid ? `We warned ${partner}` : `We asked ${partner} to put it back`,
            detail: `They have ${RESTORE_DAYS} days to restore it.`,
            date: detectedAt,
            state: "done",
          },
          {
            label: done ? "Deadline passed — not restored" : `Deadline to restore · ${left}`,
            date: deadline,
            state: done ? "done" : "current",
          },
          {
            label: `${partner} penalized`,
            detail: `+${points} penalty point on their account.`,
            date: b.penalty?.at,
            state: done ? "done" : "upcoming",
          },
          paid
            ? {
                label: "No refund — you paid them directly",
                detail: "There's no escrow to refund from; the penalty is the only consequence for them.",
                date: b.penalty?.at,
                state: done ? "done" : "upcoming",
              }
            : {
                label: "Remove your link — no need to keep it",
                detail: `You gave ${partner} a link in return. Take it down from your page, no penalty for you.`,
                state: done ? "current" : "upcoming",
              },
          ...(paid
            ? []
            : [
                {
                  label: "We close the deal automatically",
                  detail: "The next daily scan sees your link is gone and closes the deal. Nothing to confirm.",
                  state: "upcoming" as const,
                },
              ]),
        ]
      : [
          { label: "Your link wasn't found on your page", date: detectedAt, state: "done" },
          {
            label: `We notified you and ${partner}`,
            detail: `You have ${RESTORE_DAYS} days to put it back.`,
            date: detectedAt,
            state: "done",
          },
          {
            label: done ? "Deadline passed — not restored" : `Deadline to put it back · ${left}`,
            date: deadline,
            state: done ? "done" : "current",
          },
          {
            label: "You get a penalty point",
            detail: `+${points} point. ${penaltyRules.suspensionThreshold} points in a month suspends your account.`,
            date: b.penalty?.at,
            state: done ? "done" : "upcoming",
          },
          paid
            ? {
                label: "No refund for the buyer — there's no escrow",
                detail: "They already paid you directly; this only adds a penalty point to your account.",
                date: b.penalty?.at,
                state: done ? "done" : "upcoming",
              }
            : {
                label: `${partner} may remove their link to you`,
                state: done ? "done" : "upcoming",
              },
        ];

  const summary =
    remover === "partner"
      ? done
        ? paid
          ? `${partner} didn't put it back by ${deadline}. We penalized them — no refund, since there's no escrow.`
          : `${partner} didn't put it back by ${deadline}. We penalized them — you don't need to keep your link, remove it.`
        : paid
          ? `We warned the seller. If it's not back by ${deadline}, they're penalized. There's no escrow, so no refund.`
          : `We asked ${partner} to put it back by ${deadline}. If they don't, they're penalized and you may remove your link.`
      : done
        ? paid
          ? `Not put back by ${deadline}: you got +${points} penalty point. No refund for the buyer — there's no escrow.`
          : `Not put back by ${deadline}: you got +${points} penalty point; ${partner} may remove theirs.`
        : `Put it back by ${deadline} or you get a penalty point${paid ? " — there's no escrow, so no refund happens" : `; ${partner} may then remove theirs`}.`;

  const badge = done ? (remover === "partner" ? "Partner penalized" : "You were penalized") : `Missing · ${left}`;

  return {
    stage,
    remover,
    detectedAt,
    deadline,
    daysLeft,
    badge,
    summary,
    steps,
    canRemoveYours: done && remover === "partner" && !paid,
  };
}
