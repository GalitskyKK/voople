"use client";

import { Loader2, MessageSquareMore } from "lucide-react";
import { useState } from "react";

export function GroupTopicsSettings({
  enabled,
  canManage,
  onChange,
}: {
  enabled: boolean;
  canManage: boolean;
  onChange: (enabled: boolean, layout: "tabs" | "list") => Promise<unknown>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (nextEnabled: boolean, nextLayout: "tabs" | "list") => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onChange(nextEnabled, nextLayout);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить разделы");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] p-3">
      <label className="flex items-center justify-between gap-4">
        <span className="flex items-start gap-3">
          <MessageSquareMore className="mt-0.5 h-4 w-4 text-(--theme-accent)" />
          <span>
            <span className="block text-sm font-medium">Разделы</span>
            <span className="mt-0.5 block text-xs leading-5 text-[var(--app-muted)]">
              Отдельные обсуждения открываются во вкладках над сообщениями.
            </span>
          </span>
        </span>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--app-muted)]" />
        ) : (
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canManage}
            onChange={(event) => void update(event.target.checked, "tabs")}
            className="settings-switch shrink-0"
            aria-label="Включить разделы группы"
          />
        )}
      </label>
      {!canManage ? (
        <p className="mt-2 text-xs text-[var(--app-muted)]">
          Включить или отключить разделы может владелец или администратор.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
