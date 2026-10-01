import type { OfferStatus } from "@/lib/types";

/** Human-readable labels for offer states. The enum values stay as-is in code. */
export const offerStatusLabels: Record<OfferStatus, string> = {
  SENT: "Sent",
  ACCEPTED: "Accepted",
  PAYMENT_RECEIVED: "Payment Received",
  DELIVERED: "Delivered",
  ACTIVE_MONITORING: "Active",
  ANOMALY_CHECK: "Checking Anomaly",
  VIOLATED_BANNED: "Violated (Seller Banned)",
  VIOLATED_NO_BAN: "Violated (No Ban)",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};
