import type { AccountStanding, ViolationType } from "@/lib/types";

export const penaltyRules = {
  /** Each violation adds this many points (monthly window) */
  pointsPerViolation: 1,
  /** DELIVERY_REJECTED (fraudulent/fake delivery) — straight to suspension */
  deliveryRejectedPoints: 3,
  /** A link removed and not restored within its 7 days — immediate suspension */
  linkRemovedPoints: 3,
  suspensionThreshold: 3,
  /** Suspension lasts 3 months */
  suspensionDays: 90,
};

export const violationLabels: Record<ViolationType, string> = {
  seller_no_response_72h: "Seller didn't respond within 72 hours",
  buyer_payment_not_sent: "Buyer didn't send payment in time",
  seller_no_delivery_72h: "Seller didn't deliver within 72 hours",
  one_sided_delivery: "One-sided delivery on Exchange/ABC",
  delivery_rejected: "Delivery rejected as fraudulent",
  link_removed: "Live link removed and not restored within 7 days",
};


const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The account's standing for the current monthly window. Violations aren't recorded anywhere yet,
 * so every account starts (and stays) at zero points until penalties are persisted.
 */
export function currentStanding(now = new Date()): AccountStanding {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    penaltyPoints: 0,
    maxPoints: penaltyRules.suspensionThreshold,
    windowStartedAt: iso(start),
    windowResetsAt: iso(reset),
    violations: [],
    suspendedUntil: null,
  };
}
