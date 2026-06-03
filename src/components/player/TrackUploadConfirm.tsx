"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { TrackMetadataDraft } from "@/lib/player/metadata";

export type PendingTrackUpload = {
  file: File;
  previewUrl: string;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

type TrackUploadConfirmProps = {
  pending: PendingTrackUpload;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (draft: TrackMetadataDraft) => void;
};

export function TrackUploadConfirm({
  pending,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: TrackUploadConfirmProps) {
  const [title, setTitle] = useState(pending.title);
  const [artist, setArtist] = useState(pending.artist);

  useEffect(() => {
    setTitle(pending.title);
    setArtist(pending.artist);
  }, [pending.title, pending.artist]);

  const canConfirm = title.trim().length > 0 && artist.trim().length > 0;

  return (
    <div className="mb-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--foreground)]">Новый трек</p>
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
              durationSeconds: pending.durationSeconds,
            })
          }
        >
          {isSubmitting ? "Добавление…" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}
