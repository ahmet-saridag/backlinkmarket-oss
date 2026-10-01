"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/Field";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { cryptoNetworks, payoutMethodLabels, payoutMethods, type FieldErrors } from "@/lib/validation/account";

export type PayoutMethodId = (typeof payoutMethods)[number];

/** What the payout form edits. The address is write-only: it's never read back from the server. */
export interface PayoutDraft {
  method: PayoutMethodId;
  accountHolder: string;
  network: string;
  address: string;
}

export const emptyPayoutDraft = (): PayoutDraft => ({ method: "wire", accountHolder: "", network: "", address: "" });

const addressLabel: Record<PayoutMethodId, string> = {
  wire: "IBAN / account number",
  bank_transfer: "IBAN / account number",
  paypal: "PayPal e-mail",
  crypto: "USDT wallet address",
};

/** Inline validation message under a field. */
export function FieldError({ children }: { children?: string }) {
  return children ? (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  ) : null;
}

/**
 * The four seller payout methods and their fields — wire, PayPal, USDT or bank transfer, nothing
 * else. Shared by the Account page and Add Site (where Paid Market needs a payout account).
 */
export function PayoutFields({
  draft,
  onChange,
  errors,
  hint,
  idPrefix = "payout",
}: {
  draft: PayoutDraft;
  onChange: (next: PayoutDraft) => void;
  errors: FieldErrors;
  hint?: string;
  idPrefix?: string;
}) {
  return (
    <>
      <Field label="Payout method">
        <SimpleSelect
          value={draft.method}
          onChange={(v) => onChange({ ...draft, method: v as PayoutMethodId, network: "", address: "" })}
          options={payoutMethods.map((m) => ({ value: m, label: payoutMethodLabels[m] }))}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* A crypto wallet has no account holder */}
        {draft.method !== "crypto" && (
          <Field label="Account holder name" htmlFor={`${idPrefix}-holder`}>
            <Input
              id={`${idPrefix}-holder`}
              value={draft.accountHolder}
              maxLength={70}
              aria-invalid={!!errors.accountHolder}
              onChange={(e) => onChange({ ...draft, accountHolder: e.target.value })}
              placeholder="As shown on the account"
            />
            <FieldError>{errors.accountHolder}</FieldError>
          </Field>
        )}
        {draft.method === "crypto" ? (
          <Field label="Network" hint="USDT only.">
            <SimpleSelect
              value={draft.network || null}
              onChange={(v) => onChange({ ...draft, network: v })}
              options={cryptoNetworks.map((n) => ({ value: n, label: `USDT · ${n}` }))}
              placeholder="Pick a network…"
            />
            <FieldError>{errors.network}</FieldError>
          </Field>
        ) : draft.method === "wire" ? (
          <Field label="SWIFT / BIC" htmlFor={`${idPrefix}-network`}>
            <Input
              id={`${idPrefix}-network`}
              value={draft.network}
              maxLength={11}
              aria-invalid={!!errors.network}
              onChange={(e) => onChange({ ...draft, network: e.target.value.toUpperCase() })}
              placeholder="e.g. BUKBGB22"
              className="font-mono"
            />
            <FieldError>{errors.network}</FieldError>
          </Field>
        ) : draft.method === "bank_transfer" ? (
          <Field label="Bank code / routing number (optional)" htmlFor={`${idPrefix}-network`}>
            <Input
              id={`${idPrefix}-network`}
              value={draft.network}
              maxLength={34}
              onChange={(e) => onChange({ ...draft, network: e.target.value })}
            />
          </Field>
        ) : null}
      </div>
      <Field label={addressLabel[draft.method]} htmlFor={`${idPrefix}-address`} hint={hint}>
        <Input
          id={`${idPrefix}-address`}
          value={draft.address}
          maxLength={100}
          aria-invalid={!!errors.address}
          // IBANs and SWIFT codes are upper case; e-mails and wallet addresses are case-sensitive and stay as typed
          onChange={(e) => onChange({ ...draft, address: draft.method === "wire" || draft.method === "bank_transfer" ? e.target.value.toUpperCase() : e.target.value })}
          placeholder={draft.method === "paypal" ? "you@example.com" : draft.method === "crypto" ? (draft.network.startsWith("Tron") ? "T… (Tron address)" : "0x… (Ethereum address)") : "e.g. GB33 BUKB 2020 1555 5555 55"}
          className={draft.method === "paypal" ? undefined : "font-mono"}
          autoComplete="off"
        />
        <FieldError>{errors.address}</FieldError>
      </Field>
    </>
  );
}
