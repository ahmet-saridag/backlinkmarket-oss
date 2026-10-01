"use client";

import { useState, useTransition } from "react";
import { Banknote, CircleCheck } from "lucide-react";
import { removePayoutAccount, saveNotificationPrefs, savePayoutAccount, saveProfile } from "@/app/(app)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AccountSection } from "@/components/account/AccountSection";
import { FieldError, PayoutFields, emptyPayoutDraft, type PayoutDraft } from "@/components/account/PayoutFields";
import { Field } from "@/components/shared/Field";
import { toOptions } from "@/components/shared/SimpleSelect";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { countries, languages } from "@/lib/labels";
import { allTimeZones, timeZoneLabel } from "@/lib/geo-data";
import { useSetTimezone } from "@/components/account/user-context";
import { toast } from "@/lib/toast";
import {
  fieldErrors,
  notificationSchema,
  payoutMethodLabels,
  payoutSchema,
  profileSchema,
  type ActionResult,
  type FieldErrors,
  type NotificationPrefs,
} from "@/lib/validation/account";
import type { AccountProfile, PayoutAccount } from "@/lib/types";

// Account page sections, each shown in its own card.

const timeZoneOptions = allTimeZones.map((tz) => ({ value: tz, label: timeZoneLabel(tz) }));

/** Runs a server action and reports the outcome: field errors, a general error or a brief "Saved". */
function useSave() {
  const [pending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const run = (action: () => Promise<ActionResult>, onOk?: () => void, successMessage = "Saved") => {
    setError("");
    setServerErrors({});
    setSaved(false);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setSaved(true);
        onOk?.();
        toast.success(successMessage);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const message = result.fieldErrors ? Object.values(result.fieldErrors)[0] : undefined;
        setServerErrors(result.fieldErrors ?? {});
        setError(result.error ?? "");
        toast.error(result.error ?? message ?? "Couldn't save. Please try again.");
      }
    });
  };
  return { pending, serverErrors, error, saved, run, clear: () => (setError(""), setServerErrors({})) };
}

function SaveStatus({ saved, error }: { saved: boolean; error: string }) {
  if (error)
    return (
      <span role="alert" className="text-xs text-destructive">
        {error}
      </span>
    );
  return saved ? <span className="text-xs text-green-700 dark:text-green-400">Saved</span> : null;
}

export function ProfileSection({ profile: initial }: { profile: AccountProfile }) {
  const [profile, setProfile] = useState(initial);
  const [saved0, setSaved0] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const { pending, serverErrors, error, saved, run, clear } = useSave();
  const setTimezone = useSetTimezone();

  const parsed = profileSchema.safeParse(profile);
  const clientErrors = parsed.success ? {} : fieldErrors(parsed.error);
  const errors: FieldErrors = attempted ? { ...serverErrors, ...clientErrors } : serverErrors;
  const dirty = JSON.stringify(profile) !== JSON.stringify(saved0);

  const update = (patch: Partial<AccountProfile>) => {
    setProfile({ ...profile, ...patch });
    clear();
  };
  const submit = () => {
    setAttempted(true);
    if (!parsed.success) return;
    run(
      () => saveProfile(parsed.data),
      () => {
        setSaved0(profile);
        setProfile({ ...profile, displayName: parsed.data.displayName.trim(), username: parsed.data.username });
        setTimezone(parsed.data.timezone);
      },
      "Profile saved",
    );
  };

  return (
    <AccountSection id="profile" title="Profile details" description="How you appear to sellers, partners and pool members.">
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Display name" htmlFor="display-name">
            <Input
              id="display-name"
              value={profile.displayName}
              maxLength={50}
              aria-invalid={!!errors.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
            />
            <FieldError>{errors.displayName}</FieldError>
          </Field>
          <Field label="Username" htmlFor="username" hint="3–20 characters: lowercase letters, numbers, underscores.">
            <Input
              id="username"
              value={profile.username}
              maxLength={20}
              autoComplete="off"
              aria-invalid={!!errors.username}
              onChange={(e) => update({ username: e.target.value.toLowerCase().replace(/\s/g, "") })}
            />
            <FieldError>{errors.username}</FieldError>
          </Field>
          <Field label="Email" htmlFor="email" hint="From your Google account — used for sign-in and receipts, never shown to other users." className="sm:col-span-2">
            <Input id="email" type="email" value={profile.email} readOnly disabled />
          </Field>
          <Field label="Country">
            <SearchableSelect
              value={profile.country}
              onChange={(v) => update({ country: v })}
              options={toOptions(countries)}
              placeholder="Search countries…"
            />
            <FieldError>{errors.country}</FieldError>
          </Field>
          <Field label="Language">
            <SearchableSelect
              value={profile.language}
              onChange={(v) => update({ language: v })}
              options={toOptions(languages)}
              placeholder="Search languages…"
            />
            <FieldError>{errors.language}</FieldError>
          </Field>
          <Field label="Timezone" className="sm:col-span-2">
            <SearchableSelect
              value={profile.timezone}
              onChange={(v) => update({ timezone: v })}
              options={timeZoneOptions}
              placeholder="Search time zones…"
            />
            <FieldError>{errors.timezone}</FieldError>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" className="w-fit rounded-full" disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
          <SaveStatus saved={saved} error={error} />
        </div>
      </form>
    </AccountSection>
  );
}

const maskAddress = (v: string) => (v.length <= 4 ? v : `•••• ${v.slice(-4)}`);

function PayoutSection({ payout: initial }: { payout: PayoutAccount }) {
  const [editing, setEditing] = useState(!initial.connected);
  const [attempted, setAttempted] = useState(false);
  const [draft, setDraft] = useState<PayoutDraft>({
    ...emptyPayoutDraft(),
    method: initial.method ?? "wire",
    accountHolder: initial.accountHolder ?? "",
  });
  const { pending, serverErrors, error, saved, run, clear } = useSave();
  // The saved account comes from the server (props); after a save the page re-renders with fresh data.
  const account = initial;

  const parsed = payoutSchema.safeParse(draft);
  const clientErrors = parsed.success ? {} : fieldErrors(parsed.error);
  const errors: FieldErrors = attempted ? { ...serverErrors, ...clientErrors } : serverErrors;

  const save = () => {
    setAttempted(true);
    if (!parsed.success) return;
    run(
      () => savePayoutAccount(parsed.data),
      () => {
        setDraft((d) => ({ ...d, address: "" }));
        setAttempted(false);
        setEditing(false);
      },
      "Payout account saved",
    );
  };

  return (
    <AccountSection
      id="payments"
      title="Payout account"
      description="How Paid Market buyers pay you directly — wire, PayPal, USDT (Tron or Ethereum) or bank transfer. Nothing else is accepted."
    >
      {account.connected && !editing ? (
        <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
          <Banknote className="size-4 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {payoutMethodLabels[account.method ?? "wire"]}
              <CircleCheck className="size-3.5 text-green-600 dark:text-green-400" aria-label="Connected" />
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {account.method === "crypto" ? `USDT · ${account.network ?? ""}` : `${account.accountHolder ?? ""}${account.network ? ` · ${account.network}` : ""}`} · {maskAddress(account.address ?? "")}
            </span>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            disabled={pending}
            onClick={() => run(removePayoutAccount, () => setEditing(true), "Payout account disconnected")}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-3 rounded-xl border px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <PayoutFields
            draft={draft}
            onChange={(next) => (setDraft(next), clear())}
            errors={errors}
            hint={account.connected ? "For security we never show your saved value — enter it again to change it." : undefined}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="rounded-full" disabled={pending}>
              {pending ? "Saving…" : "Save payout account"}
            </Button>
            {account.connected && (
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => (setEditing(false), setAttempted(false), clear())}>
                Cancel
              </Button>
            )}
            <SaveStatus saved={saved} error={error} />
          </div>
        </form>
      )}
    </AccountSection>
  );
}

/** Payout account — the only money-related account section (Paid Market has no escrow). */
export function PaymentsGroup({ payout }: { payout: PayoutAccount }) {
  return <PayoutSection payout={payout} />;
}

export function NotificationSettings({ initial }: { initial: NotificationPrefs }) {
  const [settings, setSettings] = useState<NotificationPrefs>(initial);
  const [savedSettings, setSavedSettings] = useState<NotificationPrefs>(initial);
  const { pending, error, saved, run, clear } = useSave();
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const toggle = (k: keyof NotificationPrefs) => (v: boolean) => {
    setSettings((s) => ({ ...s, [k]: v }));
    clear();
  };
  const rows: { key: keyof NotificationPrefs; title: string; description: string }[] = [
    { key: "offers", title: "New offers", description: "Someone sends you a Paid or Exchange offer." },
    { key: "deadlines", title: "Deadlines", description: "A delivery or link placement is due within 24 hours." },
    { key: "pools", title: "ABC pools", description: "One of your pools locks, or a pool you joined fills up." },
    { key: "missing", title: "Missing links", description: "A scan can't find a link — yours or a partner's." },
    { key: "payouts", title: "Payments & payouts", description: "Payments confirmed as received and deliveries confirmed." },
    { key: "disputes", title: "Link problems", description: "Anomaly checks and violation outcomes." },
    { key: "monitoring", title: "Placement reminders", description: "A timed placement is about to end." },
    { key: "site", title: "Site health", description: "Your Domain Rating moved a lot, or your rating or sitemap can't be read." },
    { key: "digest", title: "Weekly summary", description: "Monday morning: your live links, what's ending and what needs you." },
  ];
  const save = () => {
    const parsed = notificationSchema.safeParse(settings);
    if (!parsed.success) return;
    run(() => saveNotificationPrefs(parsed.data), () => setSavedSettings(parsed.data), "Notification settings saved");
  };
  return (
    <AccountSection id="notifications" title="Notifications" description="Email alerts. In-app notifications always stay on.">
      <div className="flex flex-col divide-y rounded-xl border">
        {rows.map((r) => (
          <SettingRow key={r.key} title={r.title} description={r.description} checked={settings[r.key]} onChange={toggle(r.key)} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" className="w-fit rounded-full" disabled={pending || !dirty} onClick={save}>
          {pending ? "Saving…" : "Save notifications"}
        </Button>
        <SaveStatus saved={saved} error={error} />
      </div>
    </AccountSection>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-3 py-2.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
