"use client";

import { useRouter } from "next/navigation";
import { setHeaderSite } from "@/components/sites/selected-site";

/** Opens the Offers page on this site: selects it in the shared site picker, then navigates. */
export function SiteOffersLink({
  siteId,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  siteId: string;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        setHeaderSite(siteId);
        router.push("/offers");
      }}
    >
      {children}
    </button>
  );
}
