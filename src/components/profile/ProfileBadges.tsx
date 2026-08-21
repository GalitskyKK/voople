"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { ProfileBadgesView } from "./ProfileBadgesView";

/**
 * Публичный ряд заработанных бейджей-достижений в шапке профиля.
 * Источник правды по виду бейджа — lib/badges/registry. Неизвестные id
 * (напр. удалённые из реестра) пропускаются. Пусто — ничего не рендерим.
 */
export function ProfileBadges({
  userId,
  className,
  compact = false,
  badgeIds: providedBadgeIds,
}: {
  userId: string;
  className?: string;
  compact?: boolean;
  badgeIds?: string[];
}) {
  const { data: badgeIds } = trpc.engagement.badges.useQuery(
    { userId },
    { staleTime: 60_000, enabled: providedBadgeIds === undefined },
  );

  return (
    <ProfileBadgesView
      badgeIds={providedBadgeIds ?? badgeIds ?? []}
      className={className}
      compact={compact}
      renderEventAction={(dismiss) => (
        <Link href="/events" onClick={dismiss} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-(--theme-accent)">
          Открыть событие <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    />
  );
}
