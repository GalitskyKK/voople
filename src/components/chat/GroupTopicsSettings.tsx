"use client";

import { LayoutList, Loader2, MessageSquareMore, PanelTop } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function GroupTopicsSettings({
  enabled,
  layout,
  onChange,
}: {
  enabled: boolean;
  layout: "tabs" | "list";
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
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить темы");
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
            <span className="block text-sm font-medium">Темы</span>
            <span className="mt-0.5 block text-xs leading-5 text-[var(--app-muted)]">
              Разделите большую группу на отдельные обсуждения.
            </span>
          </span>
        </span>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--app-muted)]" />
        ) : (
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => void update(event.target.checked, layout)}
            className="settings-switch shrink-0"
          />
        )}
      </label>

      {enabled ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--app-border)] pt-3">
          {(["tabs", "list"] as const).map((value) => {
            const Icon = value === "tabs" ? PanelTop : LayoutList;
            return (
              <button
                key={value}
                type="button"
                disabled={pending}
                onClick={() => void update(true, value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  layout === value
                    ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-(--theme-accent)"
                    : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {value === "tabs" ? "Вкладки" : "Список"}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
