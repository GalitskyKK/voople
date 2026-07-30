"use client";

import { CheckCheck } from "lucide-react";
import { useState } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { COPY } from "@/lib/constants/copy";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import { cn } from "@/lib/utils";
import type { NotificationView } from "@/types/notifications";
import {
  notificationActionText,
  notificationHref,
  notificationIcon,
  notificationText,
} from "./notification-ui";

type NotificationsViewProps = {
  items: NotificationView[];
  loading: boolean;
  error?: string | null;
  markingRead: boolean;
  onMarkAllRead: () => void;
  onRetry?: () => void;
  renderDestination: NavigationDestinationRenderer;
  badgeUrl?: string;
};

export function NotificationsView({
  items,
  loading,
  error,
  markingRead,
  onMarkAllRead,
  onRetry,
  renderDestination,
  badgeUrl = vooplusBadgeUrl(),
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const visibleItems =
    filter === "unread" ? items.filter((item) => !item.read) : items;
  const hasUnread = items.some((item) => !item.read);

  return (
    <SectionFrame className="gap-5 py-4 lg:py-6">
      <SectionPageHeader title={COPY.notifications} />

      {loading ? (
        <div
          className="h-32 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          aria-label="Загрузка уведомлений"
        />
      ) : (
        <div className="voople-notifications space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div
              className="settings-segmented"
              aria-label="Фильтр уведомлений"
            >
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Все
              </button>
              <button
                type="button"
                aria-pressed={filter === "unread"}
                onClick={() => setFilter("unread")}
              >
                Новые
              </button>
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={markingRead}
                className="inline-flex items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-xs text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Прочитать всё
              </button>
            )}
          </div>

          {error && (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              <span>{error}</span>
              {onRetry && (
                <button
                  type="button"
                  className="shrink-0 rounded-lg border-0 bg-transparent px-2 py-1 font-medium text-red-200 hover:bg-red-300/10"
                  onClick={onRetry}
                >
                  Повторить
                </button>
              )}
            </div>
          )}

          {visibleItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--app-border)] px-4 py-10 text-center text-sm text-[var(--app-muted)]">
              {filter === "unread"
                ? "Новых уведомлений нет"
                : "Пока здесь ничего нет"}
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleItems.map((notification) => {
                const actor = notification.actor;
                const Icon = notificationIcon(notification.type);
                const href = notificationHref(notification);
                const className = cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]",
                  notification.read
                    ? "border-[color-mix(in_srgb,var(--foreground)_5%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)]"
                    : "border-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)] bg-[var(--app-accent-soft)]",
                );

                return (
                  <li key={notification.id}>
                    {renderDestination({
                      href,
                      label: notificationText(
                        notification.type,
                        actor?.displayName ?? "",
                      ),
                      className,
                      active: false,
                      children: (
                        <>
                          <span className="mt-0.5 text-[var(--theme-accent)]">
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
                              {notification.type === "profile_canvas_draw" ||
                              !actor ? (
                                notificationText(
                                  notification.type,
                                  actor?.displayName ?? "",
                                )
                              ) : (
                                <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                  <DisplayNameWithPin
                                    hasVooplePlus={actor.hasVooplePlus}
                                    badgeUrl={badgeUrl}
                                    size="xs"
                                  >
                                    {actor.displayName}
                                  </DisplayNameWithPin>
                                  <span>
                                    {notificationActionText(notification.type)}
                                  </span>
                                </span>
                              )}
                            </p>
                            <RelativeTime
                              iso={notification.createdAt}
                              className="mt-1 block text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]"
                            />
                          </div>
                        </>
                      ),
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </SectionFrame>
  );
}
