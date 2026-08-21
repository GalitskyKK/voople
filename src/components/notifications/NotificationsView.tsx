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

type NotificationFilter = "all" | "mentions" | "reactions" | "follows" | "groups";

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "mentions", label: "Упоминания" },
  { id: "reactions", label: "Реакции" },
  { id: "follows", label: "Подписки" },
  { id: "groups", label: "Группы" },
];

function matchesFilter(item: NotificationView, filter: NotificationFilter) {
  if (filter === "all") return true;
  if (filter === "mentions") return item.type === "mention" || item.type === "reply";
  if (filter === "reactions") return ["like", "profile_reaction", "repost"].includes(item.type);
  if (filter === "follows") return item.type === "follow";
  return item.type.startsWith("group_") || item.type.startsWith("room_");
}

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
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const visibleItems = items.filter((item) => matchesFilter(item, filter));
  const hasUnread = items.some((item) => !item.read);

  return (
    <SectionFrame size="wide" className="gap-5 py-4 lg:py-6">
      <SectionPageHeader
        title={COPY.notifications}
        density="compact"
        sticky
      />

      <div className="grid items-start gap-5 xl:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="voople-scroll -mt-2 flex gap-1 overflow-x-auto rounded-2xl bg-[var(--app-surface-soft)] p-1 xl:sticky xl:top-24 xl:mt-0 xl:flex-col xl:overflow-visible" aria-label="Категория уведомлений">
        {FILTERS.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={cn("min-w-24 flex-1 rounded-xl px-3 py-2 text-xs font-medium transition xl:w-full xl:flex-none xl:text-left", filter === id ? "bg-[var(--app-surface)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]" : "text-[var(--app-muted)] hover:text-[var(--foreground)]")}>{label}</button>
        ))}
      </div>

      <div className="min-w-0">
      {loading ? (
        <div
          className="h-32 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          aria-label="Загрузка уведомлений"
        />
      ) : (
        <div className="voople-notifications space-y-3">
          {hasUnread ? (
          <div className="flex justify-end">
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={markingRead}
                className="inline-flex items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-xs text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Прочитать всё
              </button>
          </div>
          ) : null}

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
              {filter === "all" ? "Пока здесь ничего нет" : "В этой категории уведомлений нет"}
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
      </div>
      </div>
    </SectionFrame>
  );
}
