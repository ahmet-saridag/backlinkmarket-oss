"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { mirrorAvatar } from "@/app/(app)/account/actions";
import { useUser } from "@/components/account/user-context";

/**
 * Renders nothing. If the account's photo still points at Google, stores a copy with us once per
 * browser session so it shows up for other users in the market too.
 */
export function AvatarMirror() {
  const { avatarUrl, id } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!avatarUrl || avatarUrl.includes("/storage/v1/object/public/avatars/")) return;
    const key = `avatar-mirrored-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    mirrorAvatar().then((r) => r.ok && router.refresh());
  }, [avatarUrl, id, router]);
  return null;
}
