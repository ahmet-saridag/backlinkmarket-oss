"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Camera, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/account/UserAvatar";
import { useSetAvatarUrl, useUser } from "@/components/account/user-context";
import { fileToAvatar, removeAvatar, uploadAvatar } from "@/components/account/profile-photo";
import { countryFlag } from "@/lib/flags";
import { timeZoneLabel } from "@/lib/geo-data";
import { useAccountStanding } from "@/components/standing/standing";
import { cn } from "@/lib/utils";
import type { AccountProfile } from "@/lib/types";

/** Top of the account page: photo (changeable), name, verification and a few numbers. */
export function ProfileHero({
  profile,
  stats,
}: {
  profile: AccountProfile;
  stats: { label: string; value: string; tone?: "warn" }[];
}) {
  const user = useUser();
  const setAvatarUrl = useSetAvatarUrl();
  const photo = user.avatarUrl;
  const standing = useAccountStanding();
  const all = [
    ...stats,
    {
      label: "Penalty points",
      value: `${Math.min(standing.penaltyPoints, standing.maxPoints)}/${standing.maxPoints}`,
      tone: standing.penaltyPoints > 0 ? ("warn" as const) : undefined,
    },
  ];
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const v = profile.verification;

  const onFile = async (file?: File) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Pick an image file (JPG, PNG or WebP).");
    if (file.size > 8 * 1024 * 1024) return setError("That image is over 8 MB — pick a smaller one.");
    try {
      setAvatarUrl(await uploadAvatar(user.id, await fileToAvatar(file)));
    } catch {
      setError("Couldn't upload that image. Try another one.");
    }
  };

  const onRemove = async () => {
    setError("");
    try {
      await removeAvatar(user.id);
      setAvatarUrl(null);
    } catch {
      setError("Couldn't remove the photo. Try again.");
    }
  };

  return (
    <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="group relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Change profile photo"
          >
            <UserAvatar size={96} className="ring-4 ring-background" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera className="size-5" />
            </span>
            <span className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border-2 border-card bg-sky-500 text-white">
              <BadgeCheck className="size-4" aria-label="Verified" />
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {/* Identity */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-[450] tracking-[-0.03em]">{user.displayName}</h2>
            <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{user.plan}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            @{profile.username} · {user.email ?? profile.email}
          </span>
          <span className="text-xs text-muted-foreground">
            {countryFlag(profile.country)} {profile.country} · {timeZoneLabel(profile.timezone)} · Member since {profile.memberSince}
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => input.current?.click()}>
              <Camera className="size-3.5" /> {photo ? "Change photo" : "Upload photo"}
            </Button>
            {photo && (
              <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={onRemove}>
                <Trash2 className="size-3.5" /> Remove
              </Button>
            )}
          </div>
          {error ? (
            <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Square works best · JPG, PNG or WebP · shown on your offers and pools</span>
          )}
        </div>

        {/* Verification */}
        <div className="flex gap-3 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-3 md:w-72">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="flex flex-col gap-0.5 text-[13px]">
            <span className="font-medium">Verified account</span>
            <span className="text-xs text-muted-foreground">
              {v.method} · {v.verifiedAt}
            </span>
            <span className="text-xs text-muted-foreground">Sellers and partners see the badge next to your name.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {all.map((s) => (
          <div key={s.label} className="flex flex-col rounded-xl bg-muted/50 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
            <span className={cn("text-lg font-medium tabular-nums", s.tone === "warn" && "text-amber-700 dark:text-amber-400")}>{s.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
