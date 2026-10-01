import { z } from "zod";
import { allCountries, allLanguages, allTimeZones } from "@/lib/geo-data";

/* Account-page validation. Shared by the forms (instant feedback) and the server actions (the real check). */

export const notificationKeys = ["offers", "deadlines", "pools", "missing", "payouts", "disputes", "monitoring", "site", "digest"] as const;
export type NotificationKey = (typeof notificationKeys)[number];
export type NotificationPrefs = Record<NotificationKey, boolean>;

/** Letters (any script), numbers, spaces and . ' - — must start with a letter or number. */
const personName = /^[\p{L}\p{N}][\p{L}\p{N} .'’-]*$/u;

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name needs at least 2 characters.")
    .max(50, "Display name can be at most 50 characters.")
    .regex(personName, "Use letters, numbers, spaces, dots, apostrophes or hyphens only."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username needs at least 3 characters.")
    .max(20, "Username can be at most 20 characters.")
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only."),
  country: z.string().refine((v) => allCountries.includes(v), "Pick a country from the list."),
  language: z.string().refine((v) => allLanguages.includes(v), "Pick a language from the list."),
  timezone: z.string().refine((v) => allTimeZones.includes(v), "Pick a time zone from the list."),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const notificationSchema = z.object({
  offers: z.boolean(),
  deadlines: z.boolean(),
  pools: z.boolean(),
  missing: z.boolean(),
  payouts: z.boolean(),
  disputes: z.boolean(),
  monitoring: z.boolean(),
  site: z.boolean(),
  digest: z.boolean(),
});

/** ISO 13616 mod-97 check. */
export function isValidIban(iban: string) {
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

export const normalizeIban = (raw: string) => raw.replace(/[\s-]/g, "").toUpperCase();

/**
 * Paid Market has exactly four seller payout methods — nothing else can be entered, on the
 * client or the server.
 */
export const payoutMethods = ["wire", "paypal", "crypto", "bank_transfer"] as const;
export const payoutMethodLabels: Record<(typeof payoutMethods)[number], string> = {
  wire: "Wire transfer",
  paypal: "PayPal",
  crypto: "USDT (crypto)",
  bank_transfer: "Bank transfer",
};

/** How a seller wants to be paid, in a few words: "PayPal", "USDT · Tron", "Wire transfer"… */
export const payoutViaLabel = (method: (typeof payoutMethods)[number], network?: string | null) =>
  method === "crypto" ? `USDT · ${(network ?? "").replace(/ \(.*\)$/, "")}`.trim() : payoutMethodLabels[method];

/** Crypto payouts are USDT only, on Tron (TRC-20) or Ethereum (ERC-20). */
export const cryptoNetworks = ["Tron (TRC-20)", "Ethereum (ERC-20)"] as const;

const cryptoAddressPatterns: Record<(typeof cryptoNetworks)[number], RegExp> = {
  "Ethereum (ERC-20)": /^0x[a-fA-F0-9]{40}$/,
  "Tron (TRC-20)": /^T[A-Za-z1-9]{33}$/,
};

const swiftBic = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

const accountHolderField = z
  .string()
  .trim()
  .min(2, "Enter the account holder's name.")
  .max(70, "Account holder can be at most 70 characters.")
  .regex(personName, "Use letters, numbers, spaces, dots, apostrophes or hyphens only.");

export const payoutSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("wire"),
    accountHolder: accountHolderField,
    network: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => swiftBic.test(v), "Enter a valid SWIFT/BIC code (8 or 11 characters)."),
    address: z
      .string()
      .transform(normalizeIban)
      .refine((v) => isValidIban(v) || /^[0-9]{6,17}$/.test(v), "Enter a valid IBAN (e.g. GB33 BUKB 2020 1555 5555 55) or a 6–17 digit account number."),
  }),
  z.object({
    method: z.literal("bank_transfer"),
    accountHolder: accountHolderField,
    network: z.string().trim().max(34, "At most 34 characters.").optional().or(z.literal("")),
    address: z
      .string()
      .transform(normalizeIban)
      .refine((v) => isValidIban(v) || /^[0-9]{6,17}$/.test(v), "Enter a valid IBAN or a 6–17 digit account number."),
  }),
  z.object({
    method: z.literal("paypal"),
    accountHolder: accountHolderField,
    address: z.email("Enter the PayPal e-mail address."),
  }),
  z.object({
    method: z.literal("crypto"),
    // A wallet has no account holder
    network: z.enum(cryptoNetworks, "Pick USDT on Tron or Ethereum."),
    address: z.string().trim(),
  }).refine((v) => cryptoAddressPatterns[v.network].test(v.address), {
    message: "That doesn't look like a valid address for this network.",
    path: ["address"],
  }),
]);
export type PayoutInput = z.infer<typeof payoutSchema>;

export type FieldErrors = Record<string, string>;

/** Collapses zod issues to { field: first message }. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export type ActionResult = { ok: true } | { ok: false; error?: string; fieldErrors?: FieldErrors };
