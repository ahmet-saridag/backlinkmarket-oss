"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { APP_URL } from "@/lib/app-url";
import { cn } from "@/lib/utils";

// Google's favicon service has no icon for a domain until it has crawled it; our own domain uses the brand mark.
const OWN_HOST = new URL(APP_URL).hostname;

/** Google's favicon service: returns the site's icon (or a generic globe) for any domain. */
const faviconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

/** Small site logo shown to the left of a domain. Falls back to a globe if the icon can't load. */
export function SiteFavicon({ domain, size = 16, className }: { domain: string; size?: number; className?: string }) {
  // Remember which domain failed so a new domain (e.g. while typing) gets a fresh try
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const failed = failedFor === domain;
  const box = cn("shrink-0 rounded-[4px]", className);
  if (domain === OWN_HOST || domain === `www.${OWN_HOST}`) return <LogoMark size={size} className={cn("rounded-[4px]", className)} />;
  if (!domain || failed) {
    return <Globe aria-hidden className={cn(box, "text-muted-foreground")} style={{ width: size, height: size }} />;
  }
  return (
    <Image
      src={faviconUrl(domain)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      loading="lazy"
      onError={() => setFailedFor(domain)}
      className={cn(box, "bg-white/90 object-contain")}
      style={{ width: size, height: size }}
    />
  );
}

/** Favicon + domain, inline. Use wherever a site is identified by its domain. */
export function SiteLabel({
  domain,
  size = 16,
  className,
  children,
}: {
  domain: string;
  size?: number;
  className?: string;
  /** What to show instead of the bare domain (e.g. "https://domain"); the icon still uses `domain`. */
  children?: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <SiteFavicon domain={domain} size={size} />
      <span className="truncate">{children ?? domain}</span>
    </span>
  );
}
