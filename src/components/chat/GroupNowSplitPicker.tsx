"use client";

import { GitFork } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { selectedSplitUsers, toggleSplitSelection } from "@/lib/chat/live-move-selection";
import type { GroupNowUser } from "@/types/group-now";

export function GroupNowSplitPicker({
  candidates,
  pending,
  onClose,
  onSubmit,
}: {
  candidates: GroupNowUser[] | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (users: GroupNowUser[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { if (!candidates) queueMicrotask(() => setSelected([])); }, [candidates]);
  const chosen = selectedSplitUsers(candidates ?? [], selected);
  return (
    <Sheet open={candidates !== null} onClose={onClose} ariaLabel="Выбрать участника для Сплита" className="max-w-md">
      <div className="flex items-center gap-3">
        <GitFork className="h-5 w-5 text-[var(--theme-accent)]" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Сплит</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--app-muted)]">Выберите участников текущего разговора. Все останутся здесь до согласия каждого.</p>
      <div className="mt-5 flex flex-col gap-2">
        {candidates?.map((user) => (
          <label key={user.id} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[var(--app-border)] px-3 py-2.5 hover:bg-[var(--app-surface-hover)] focus-within:ring-2 focus-within:ring-[var(--theme-accent)]">
            <input type="checkbox" className="accent-[var(--theme-accent)]" checked={selected.includes(user.id)} disabled={pending}
              onChange={() => setSelected((ids) => toggleSplitSelection(ids, user.id))} />
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- portable CDN avatar shared with Tauri.
              <img src={user.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-xs">{(user.displayName || user.username).slice(0, 1)}</span>}
            <span className="min-w-0 truncate text-sm">{user.displayName || user.username}</span>
          </label>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
        <Button type="button" disabled={!chosen.length || pending} onClick={() => onSubmit(chosen)}>Отделиться · {chosen.length}</Button>
      </div>
    </Sheet>
  );
}
