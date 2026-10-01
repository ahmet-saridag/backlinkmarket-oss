import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

/** Markets that don't have a backend yet: an honest placeholder instead of pretend data. */
export function ComingSoon({ icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <EmptyState
      bordered
      icon={icon}
      title={title}
      description={description}
      action={
        <Link href="/markets/paid" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Browse Paid Market
        </Link>
      }
    />
  );
}
