"use client";

import { Globe2, LockKeyhole } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function GroupVisibilitySettings({
  value,
  canManage,
  onChange,
}: {
  value: "private" | "public";
  canManage: boolean;
  onChange: (value: "private" | "public") => Promise<unknown>;
}) {
  const [current, setCurrent] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (next: "private" | "public") => {
    if (!canManage || pending || next === current) return;
    setPending(true);
    setError(null);
    try {
      await onChange(next);
      setCurrent(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить тип группы");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] p-3" aria-labelledby="group-visibility-title">
      <h3 id="group-visibility-title" className="text-sm font-medium">Доступ к группе</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
        Закрытая группа доступна после добавления или по приглашению. Открытую можно найти и покинуть самостоятельно.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {([
          ["private", "Закрытая", LockKeyhole],
          ["public", "Открытая", Globe2],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            disabled={!canManage || pending}
            aria-pressed={current === id}
            onClick={() => void update(id)}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-60",
              current === id
                ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]"
                : "border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
