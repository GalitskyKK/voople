"use client";

import { Award, CalendarDays } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { getBadge, type BadgeDef } from "@/lib/badges/registry";
import { cn } from "@/lib/utils";
import { BadgeArtwork } from "./BadgeArtwork";

export function ProfileBadgesView({
  badgeIds,
  className,
  compact = false,
  renderEventAction,
}: {
  badgeIds: string[];
  className?: string;
  compact?: boolean;
  renderEventAction?: (dismiss: () => void) => ReactNode;
}) {
  const [selected, setSelected] = useState<BadgeDef | null>(null);
  const badges = badgeIds.map(getBadge).filter((badge) => badge !== null);
  if (badges.length === 0) return null;

  const dismiss = () => setSelected(null);

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
      <Sheet open={Boolean(selected)} onClose={dismiss} className="max-w-md">
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
            {selected.id.startsWith("team-") ? renderEventAction?.(dismiss) : null}
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
