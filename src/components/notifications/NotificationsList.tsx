"use client";

import Link from "next/link";

import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { trpc } from "@/lib/trpc/client";
import { NotificationsView } from "./NotificationsView";

export function NotificationsList() {
  const utils = trpc.useUtils();
  const notifications = trpc.notifications.list.useQuery(undefined, {
    staleTime: 15_000,
  });

  useRealtimeNotifications(true);

  const markRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
  });

  return (
    <NotificationsView
      items={notifications.data ?? []}
      loading={notifications.isLoading}
      error={notifications.error?.message}
      markingRead={markRead.isPending}
      onMarkAllRead={() => markRead.mutate()}
      onRetry={() => void notifications.refetch()}
      renderDestination={({ href, label, className, children }) => (
        <Link href={href} aria-label={label} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
