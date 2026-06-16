"use client";

import { getBadge } from "@/lib/badges/registry";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

/**
 * Публичный ряд заработанных бейджей-достижений в шапке профиля.
 * Источник правды по виду бейджа — lib/badges/registry. Неизвестные id
 * (напр. удалённые из реестра) пропускаются. Пусто — ничего не рендерим.
 */
export function ProfileBadges({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const { data: badgeIds } = trpc.engagement.badges.useQuery(
    { userId },
    { staleTime: 60_000 },
  );

  const badges = (badgeIds ?? []).map(getBadge).filter((b) => b !== null);
  if (badges.length === 0) return null;

  return (
    <ul className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {badges.map((badge) => (
        <li
          key={badge.id}
          title={badge.description}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
        >
          <span aria-hidden>{badge.emoji}</span>
          <span>{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}
