"use client";

import Link from "next/link";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { trpc } from "@/lib/trpc/client";
import {
  notificationHref,
  notificationIcon,
  notificationText,
} from "./notification-ui";

export function NotificationsList() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.notifications.list.useQuery(undefined, {
    staleTime: 15_000,
  });

  useRealtimeNotifications(true);

  const markRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
  });

  if (isLoading) {
    return <div className="mt-6 h-32 animate-pulse rounded-2xl bg-white/5" />;
  }

  if (error) {
    return <p className="mt-4 text-sm text-red-400">{error.message}</p>;
  }

  if (!data?.length) {
    return <p className="mt-6 text-white/50">Пока пусто</p>;
  }

  const hasUnread = data.some((notification) => !notification.read);

  return (
    <div className="voople-notifications mt-4 space-y-3">
      {hasUnread && (
        <button
          type="button"
          onClick={() => markRead.mutate()}
          disabled={markRead.isPending}
          className="voople-link text-sm hover:underline disabled:opacity-50"
        >
          Отметить все прочитанными
        </button>
      )}
      <ul className="space-y-2">
        {data.map((notification) => {
          const actor = notification.actor;
          const Icon = notificationIcon(notification.type);
          const href = notificationHref(notification);

          return (
            <li key={notification.id}>
              <Link
                href={href}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors hover:bg-white/5 ${
                  notification.read
                    ? "border-white/5 bg-white/[0.02]"
                    : "border-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)] bg-[var(--app-accent-soft)]"
                }`}
              >
                <span className="mt-0.5 text-[var(--theme-accent)]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/90">
                    {notificationText(
                      notification.type,
                      actor?.displayName ?? "",
                    )}
                  </p>
                  <RelativeTime iso={notification.createdAt} className="mt-1 block text-xs text-white/40" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
