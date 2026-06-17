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
    <ul className={cn("mt-2.5 flex flex-wrap gap-1.5", className)}>
      {badges.map((badge) => (
        <li
          key={badge.id}
          title={badge.description}
          className="flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] py-0.5 pl-1.5 pr-2 text-xs font-medium text-[color-mix(in_srgb,var(--foreground)_78%,transparent)] transition-colors hover:border-[var(--app-border-strong)] hover:text-[var(--foreground)]"
        >
          <span aria-hidden className="text-sm leading-none">
            {badge.emoji}
          </span>
          <span>{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}
