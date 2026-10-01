import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserSite } from "@/lib/types";

const styles: Record<UserSite["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "border-green-600/30 bg-green-600/15 text-green-700 dark:text-green-400" },
  paused: { label: "Paused", className: "border-border bg-muted text-muted-foreground" },
};

export function SiteStatusBadge({ status }: { status: UserSite["status"] }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-normal", styles[status].className)}>
      {styles[status].label}
    </Badge>
  );
}
