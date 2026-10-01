"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Seller } from "@/lib/types";

/** The seller's own account photo, falling back to initials when they have none. */
export function SellerAvatar({ seller, size = 28, className }: { seller?: Seller; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = (seller?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const box = cn("shrink-0 rounded-full", className);
  if (!seller || failed) {
    return (
      <span
        className={cn(box, "grid place-items-center bg-muted text-[10px] font-medium text-muted-foreground")}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }
  return (
    <Image
      src={seller.avatarUrl}
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(box, "bg-muted object-cover")}
      style={{ width: size, height: size }}
    />
  );
}
