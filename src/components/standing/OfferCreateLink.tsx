"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useIsSuspended } from "@/components/standing/standing";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

/** A link that starts an offer. Rendered as a disabled button while the account is suspended. */
export function OfferCreateLink({
  href,
  children,
  className,
  size,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
}) {
  const suspended = useIsSuspended();
  const classes = cn(buttonVariants({ size }), "rounded-full", className);
  if (suspended) {
    return (
      <button type="button" disabled className={classes} title="Your account is suspended">
        {children}
      </button>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
