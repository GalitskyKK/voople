"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, CalendarDays } from "lucide-react";

import { getBadge } from "@/lib/badges/registry";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import type { BadgeDef } from "@/lib/badges/registry";
import { BadgeArtwork } from "./BadgeArtwork";

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
  const [selected, setSelected] = useState<BadgeDef | null>(null);
  const { data: badgeIds } = trpc.engagement.badges.useQuery(
    { userId },
    { staleTime: 60_000, enabled: providedBadgeIds === undefined },
  );

  const badges = (providedBadgeIds ?? badgeIds ?? []).map(getBadge).filter((b) => b !== null);
  if (badges.length === 0) return null;

  return (
    <>
      <ul className={cn("mt-2.5 flex flex-wrap gap-1.5", className)} aria-label="Пины профиля">
        {badges.map((badge) => (
          <li key={badge.id}>
            <button
              type="button"
              onClick={() => setSelected(badge)}
              title={badge.label}
              aria-label={`${badge.label}: открыть описание`}
              className={cn(
                "grid place-items-center rounded-full text-[color-mix(in_srgb,var(--foreground)_82%,transparent)] transition hover:-translate-y-0.5 hover:scale-105 hover:text-[var(--foreground)]",
                compact ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm",
              )}
            >
              <BadgeArtwork badge={badge} className={compact ? "h-6 w-6" : "h-7 w-7"} />
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={Boolean(selected)} onClose={() => setSelected(null)} className="max-w-md">
        {selected ? (
          <div className="pr-8">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-accent-soft)] text-2xl text-(--theme-accent)">
              <BadgeArtwork badge={selected} className="h-12 w-12" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-(--theme-accent)">Пин профиля</p>
            <h2 className="mt-1 text-xl font-semibold">{selected.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{selected.description}.</p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 text-sm">
              {selected.id.startsWith("team-") ? <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-(--theme-accent)" /> : <Award className="mt-0.5 h-4 w-4 shrink-0 text-(--theme-accent)" />}
              <p>{selected.id.startsWith("team-") ? "Получен в событии «На чьей ты волне?» — результат определяется ответами в командном тесте." : "Этот пин выдаётся за заметное достижение и остаётся в профиле."}</p>
            </div>
            {selected.id.startsWith("team-") ? (
              <Link href="/events" onClick={() => setSelected(null)} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-(--theme-accent)">
                Открыть событие <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
