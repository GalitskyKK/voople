"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { TrackMetadataDraft } from "@/lib/player/metadata";

type TrackMetadataConfirmCardProps = {
  initialTitle: string;
  initialArtist: string;
  heading?: string;
  confirmLabel?: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (draft: TrackMetadataDraft) => void;
  className?: string;
};

export function TrackMetadataConfirmCard({
  initialTitle,
  initialArtist,
  heading = "Название трека",
  confirmLabel = "Добавить",
  isSubmitting,
  error,
  onCancel,
  onConfirm,
  className,
}: TrackMetadataConfirmCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [artist, setArtist] = useState(initialArtist);

  // Подхватываем новые initial-значения (смена распознанного трека) во время
  // рендера, без эффекта — паттерн «сравнение с предыдущими пропсами».
  const [prevInitial, setPrevInitial] = useState({ initialTitle, initialArtist });
  if (prevInitial.initialTitle !== initialTitle || prevInitial.initialArtist !== initialArtist) {
    setPrevInitial({ initialTitle, initialArtist });
    setTitle(initialTitle);
    setArtist(initialArtist);
  }

  const canConfirm = title.trim().length > 0 && artist.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-3",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--foreground)]">{heading}</p>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] hover:bg-[var(--app-surface)]"
          aria-label="Отмена"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--app-muted)]">Исполнитель</span>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            maxLength={100}
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2 text-sm",
              "text-[var(--foreground)] outline-none focus:border-[var(--theme-accent)]",
            )}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--app-muted)]">Название</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2 text-sm",
              "text-[var(--foreground)] outline-none focus:border-[var(--theme-accent)]",
            )}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canConfirm || isSubmitting}
          onClick={() =>
            onConfirm({
              title: title.trim(),
              artist: artist.trim(),
              durationSeconds: null,
            })
          }
        >
          {isSubmitting ? "Сохранение…" : confirmLabel}
        </Button>
      </div>
    </div>
  );
}
