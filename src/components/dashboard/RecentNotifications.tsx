import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellOff } from "lucide-react";
import { NotificationRow } from "@/components/layout/notifications";
import { EmptyState } from "@/components/shared/EmptyState";
import type { NotificationItem } from "@/lib/types";

export function RecentNotifications({ items }: { items: NotificationItem[] }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Recent Notifications</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {items.length === 0 ? (
          <EmptyState compact icon={BellOff} title="No notifications yet" description="Offer updates, deliveries and payouts will appear here." />
        ) : (
          <ul className="flex flex-col">
            {items.slice(0, 5).map((n) => (
              <li key={n.id}>
                <NotificationRow n={n} unread={!n.read} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
