"use client";

import { LockKeyhole, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatGroupMemberView } from "@/types/chat";

export function SubchatAccessPicker({
  mode,
  members,
  selectedIds,
  loading,
  onModeChange,
  onToggleMember,
}: {
  mode: "inherit" | "restricted";
  members: ChatGroupMemberView[];
  selectedIds: string[];
  loading: boolean;
  onModeChange: (mode: "inherit" | "restricted") => void;
  onToggleMember: (memberId: string) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-medium">Доступ</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {([
          ["inherit", "Вся группа", UsersRound],
          ["restricted", "Выбранные", LockKeyhole],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => onModeChange(id)}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-2 text-sm",
              mode === id
                ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]"
                : "border-[var(--app-border)] text-[var(--app-muted)]",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {mode === "restricted" ? (
        <div className="voople-scroll mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[var(--app-border)] p-2">
          {loading ? (
            <p className="px-2 py-3 text-xs text-[var(--app-muted)]">Загружаем участников…</p>
          ) : members.filter((member) => member.role === "member").length === 0 ? (
            <p className="px-2 py-3 text-xs text-[var(--app-muted)]">Нет участников для отдельного доступа</p>
          ) : (
            members.filter((member) => member.role === "member").map((member) => (
              <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--app-surface-soft)]">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => onToggleMember(member.id)}
                  className="accent-[var(--theme-accent)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{member.displayName}</span>
                  <span className="block truncate text-xs text-[var(--app-muted)]">@{member.username}</span>
                </span>
              </label>
            ))
          )}
          <p className="px-2 pt-1 text-[11px] leading-4 text-[var(--app-muted)]">
            Владелец и администраторы имеют доступ всегда.
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
