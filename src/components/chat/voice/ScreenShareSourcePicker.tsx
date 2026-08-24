"use client";

import { useMemo, useState } from "react";
import { AppWindow, Monitor, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { DesktopCaptureSource } from "@/lib/livekit/desktop-process-audio";

export function ScreenShareSourcePicker({
  sources,
  onSelect,
  onClose,
}: {
  sources: DesktopCaptureSource[];
  onSelect: (source: DesktopCaptureSource) => void;
  onClose: () => void;
}) {
  const hasWindows = sources.some((source) => source.kind === "window");
  const [kind, setKind] = useState<DesktopCaptureSource["kind"]>(
    hasWindows ? "window" : "screen",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = useMemo(
    () => sources.filter((source) => source.kind === kind),
    [kind, sources],
  );
  const selected = sources.find((source) => source.id === selectedId) ?? null;

  return (
    <Sheet
      open
      onClose={onClose}
      className="max-w-4xl overflow-hidden p-0"
      ariaLabel="Выбор источника демонстрации"
    >
      <header className="border-b border-[var(--app-border)] px-5 pb-4 pt-5 pr-14">
        <h2 className="text-xl font-semibold">Показать экран</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Выберите приложение или экран. Для окна Voople автоматически подключит его звук, если приложение его воспроизводит.
        </p>
      </header>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--app-surface-soft)] p-1" role="tablist">
          {([
            ["window", "Приложения", AppWindow],
            ["screen", "Весь экран", Monitor],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => {
                setKind(id);
                setSelectedId(null);
              }}
              className={cn(
                "flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                kind === id
                  ? "bg-[var(--app-surface)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
                  : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {visible.length ? (
          <div className="voople-scroll mt-4 grid max-h-[52dvh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {visible.map((source) => {
              const active = source.id === selectedId;
              const Icon = source.kind === "window" ? AppWindow : Monitor;
              return (
                <button
                  key={`${source.kind}-${source.id}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(source.id)}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-[var(--app-surface)] text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
                    active
                      ? "border-[var(--theme-accent)] ring-2 ring-[color-mix(in_srgb,var(--theme-accent)_28%,transparent)]"
                      : "border-[var(--app-border)] hover:border-[var(--app-border-strong)]",
                  )}
                >
                  <span className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--theme-accent)_20%,transparent),transparent_62%),var(--app-surface-soft)]">
                    <Icon className="h-10 w-10 text-[var(--theme-accent)] opacity-80" />
                  </span>
                  <span className="flex items-center gap-3 border-t border-[var(--app-border)] px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{source.title}</span>
                    {source.canShareAudio ? (
                      <Volume2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Звук доступен" />
                    ) : (
                      <VolumeX className="h-4 w-4 shrink-0 text-[var(--app-muted)]" aria-label="Без звука приложения" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 grid min-h-48 place-items-center rounded-xl border border-dashed border-[var(--app-border)] px-6 text-center text-sm text-[var(--app-muted)]">
            Открытые источники этого типа не найдены.
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] px-5 py-4">
        <p className="text-xs text-[var(--app-muted)]">
          Зелёный значок означает, что звук приложения можно передать отдельно от Voople.
        </p>
        <Button type="button" disabled={!selected} onClick={() => selected && onSelect(selected)}>
          Начать демонстрацию
        </Button>
      </footer>
    </Sheet>
  );
}
