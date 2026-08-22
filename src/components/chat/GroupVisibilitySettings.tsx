"use client";

import { EyeOff, Globe2, Link2, LockKeyhole, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { GroupJoinPolicy, GroupVisibility } from "@/types/chat";

const VISIBILITY_OPTIONS = [
  { id: "private", label: "Закрытая", description: "Только приглашения", icon: LockKeyhole },
  { id: "unlisted", label: "По ссылке", description: "Не видна в поиске", icon: Link2 },
  { id: "public", label: "Открытая", description: "Видна в рекомендациях", icon: Globe2 },
] as const;

const JOIN_OPTIONS = [
  { id: "open", label: "Свободный вход", description: "Участник входит сразу", icon: UserPlus },
  { id: "request", label: "По заявке", description: "Нужно одобрение команды", icon: UserCheck },
  { id: "invite_only", label: "Только приглашение", description: "Нужна действующая ссылка", icon: EyeOff },
] as const;

export function GroupVisibilitySettings({ value, joinPolicy, canManage, onChange }: {
  value: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  canManage: boolean;
  onChange: (value: GroupVisibility, joinPolicy: GroupJoinPolicy) => Promise<unknown>;
}) {
  const [current, setCurrent] = useState(value);
  const [currentJoinPolicy, setCurrentJoinPolicy] = useState(joinPolicy);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (nextVisibility: GroupVisibility, nextJoinPolicy: GroupJoinPolicy) => {
    if (!canManage || pending || (nextVisibility === current && nextJoinPolicy === currentJoinPolicy)) return;
    setPending(true);
    setError(null);
    try {
      await onChange(nextVisibility, nextJoinPolicy);
      setCurrent(nextVisibility);
      setCurrentJoinPolicy(nextJoinPolicy);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить доступ к группе");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] p-4" aria-labelledby="group-visibility-title">
      <h3 id="group-visibility-title" className="text-sm font-semibold">Видимость и вступление</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">Видимость отвечает за поиск группы, а способ вступления — за доступ новых участников.</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Кто видит группу</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {VISIBILITY_OPTIONS.map(({ id, label, description, icon: Icon }) => (
          <button key={id} type="button" disabled={!canManage || pending} aria-pressed={current === id} onClick={() => void update(id, id === "private" ? "invite_only" : currentJoinPolicy)} className={cn("min-h-20 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60", current === id ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]")}>
            <span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-[var(--theme-accent)]" />{label}</span>
            <span className="mt-1 block text-xs text-[var(--app-muted)]">{description}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Как вступают</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {JOIN_OPTIONS.map(({ id, label, description, icon: Icon }) => (
          <button key={id} type="button" disabled={!canManage || pending || (current === "private" && id !== "invite_only")} aria-pressed={currentJoinPolicy === id} onClick={() => void update(current, id)} className={cn("min-h-20 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60", currentJoinPolicy === id ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]")}>
            <span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-[var(--theme-accent)]" />{label}</span>
            <span className="mt-1 block text-xs text-[var(--app-muted)]">{description}</span>
          </button>
        ))}
      </div>
      {current === "private" ? <p className="mt-2 text-xs text-[var(--app-muted)]">Для закрытой группы используется только вход по приглашению.</p> : null}
      {error ? <p className="mt-3 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
