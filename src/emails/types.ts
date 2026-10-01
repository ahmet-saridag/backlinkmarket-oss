import { APP_URL } from "@/lib/app-url";

export type Market = "paid" | "exchange" | "abc";
export type Tone = "info" | "success" | "warn" | "danger" | "neutral";

/** Which Account → Notifications switch governs an email. `always` can't be turned off; `internal` goes to our own team. */
export type Pref = "offers" | "deadlines" | "pools" | "missing" | "payouts" | "disputes" | "monitoring" | "site" | "digest" | "always" | "internal";

export const marketNames: Record<Market, string> = { paid: "Paid Market", exchange: "Exchange", abc: "ABC Pool" };

export const prefNames: Record<Pref, string> = {
  offers: "offer emails",
  deadlines: "deadline reminders",
  pools: "ABC pool emails",
  missing: "missing-link alerts",
  payouts: "payment emails",
  disputes: "link-problem emails",
  monitoring: "placement reminders",
  site: "site-health emails",
  digest: "the weekly summary",
  always: "account-safety emails",
  internal: "internal alerts",
};

export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const appUrl = (path = "") => `${APP_URL}${path}`;

/** The deal an email is about, as every offer email receives it. Dates arrive already written for the reader's time zone. */
export interface Deal {
  ref: string;
  market: Market;
  /** The reader's own site */
  yourDomain: string;
  /** The other side's site */
  otherDomain: string;
  url: string;
}

export interface Recipient {
  /** First name, for the greeting (optional) */
  name?: string;
}

export interface LinkSpec {
  /** Site that hosts the link */
  from: string;
  /** Site it points to */
  to: string;
  /** Page it sits on, when known */
  page?: string;
  /** Page it points to */
  target?: string;
  anchor?: string;
}
