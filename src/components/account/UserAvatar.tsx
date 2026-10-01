"use client";

import { useUser } from "@/components/account/user-context";
import { cn } from "@/lib/utils";

/** The signed-in user's photo (Google's or their own upload), or their initials. */
export function UserAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const user = useUser();
  const photo = user.avatarUrl;
  const box = cn("shrink-0 rounded-full", className);
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- a Google or Storage URL, nothing to optimize
    return <img src={photo} alt="" aria-hidden referrerPolicy="no-referrer" width={size} height={size} className={cn(box, "object-cover")} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn(box, "grid place-items-center bg-gradient-to-br from-sky-500/30 to-violet-500/30 font-medium text-foreground")}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {user.initials}
    </span>
  );
}
