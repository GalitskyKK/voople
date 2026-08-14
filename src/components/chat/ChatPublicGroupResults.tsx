"use client";

import { LoaderCircle, UsersRound } from "lucide-react";

import type { PublicGroupSearchHit } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";

export function ChatPublicGroupResults({
  groups,
  loading,
  openingId,
  onOpen,
}: {
  groups: PublicGroupSearchHit[];
  loading: boolean;
  openingId: string | null;
  onOpen: (group: PublicGroupSearchHit) => void;
}) {
  if (!loading && groups.length === 0) return null;
  return (
    <section className="order-3" aria-labelledby="public-groups-title">
      <h3
        id="public-groups-title"
        className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]"
      >
        Открытые группы
      </h3>
      {loading && groups.length === 0 ? (
        <p className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--app-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Ищем группы…
        </p>
      ) : (
        <ul className="space-y-0.5">
          {groups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => onOpen(group)}
                disabled={openingId === group.id}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--app-surface-soft)] disabled:opacity-60"
              >
                <GroupAvatar
                  name={group.name}
                  avatarUrl={group.avatarUrl}
                  icon={group.icon}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="block min-w-0 truncate text-sm font-medium">{group.name}</span>
                    {group.tag ? <span className="shrink-0 rounded bg-[var(--app-accent-soft)] px-1 py-0.5 text-[9px] font-bold text-[var(--theme-accent)]">{group.tag}</span> : null}
                  </span>
                  <span className="flex items-center gap-1 truncate text-xs text-[var(--app-muted)]">
                    {group.publicSlug ? `@${group.publicSlug} · ` : null}
                    <UsersRound className="h-3 w-3 shrink-0" /> {group.memberCount} участников
                  </span>
                </span>
                <span className="text-xs font-medium text-[var(--theme-accent)]">
                  {openingId === group.id ? "Открываем…" : group.joined ? "Открыть" : "Вступить"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
