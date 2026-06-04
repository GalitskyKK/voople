"use client";

import { useRef, useState } from "react";
import { Music, Upload, X } from "lucide-react";
import { createPortal } from "react-dom";

import { TrackMetadataConfirmCard } from "@/components/player/TrackMetadataConfirmCard";
import type { PendingTrackUpload } from "@/components/player/TrackUploadConfirm";
import { useAudioUpload } from "@/hooks/useAudioUpload";
import { readTrackMetadata } from "@/lib/player/metadata";
import { trpc } from "@/lib/trpc/client";
import type { PlaylistTrackView } from "@/types/playlist";
import { cn } from "@/lib/utils";

type ChatMusicAttachSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (track: PlaylistTrackView) => void;
};

export function ChatMusicAttachSheet({ open, onClose, onSelect }: ChatMusicAttachSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingTrackUpload | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const { confirmUpload, isUploading, error, setError } = useAudioUpload();

  const { data, isLoading } = trpc.playlist.listMine.useQuery(undefined, {
    enabled: open,
    staleTime: 30_000,
  });

  if (!open || typeof document === "undefined") return null;

  const tracks = (data?.tracks ?? []).filter((track) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${track.title} ${track.artist}`.toLowerCase().includes(q);
  });

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setIsParsing(true);
    try {
      const meta = await readTrackMetadata(file);
      setPendingUpload({
        file,
        previewUrl: URL.createObjectURL(file),
        title: meta.title,
        artist: meta.artist,
        durationSeconds: meta.durationSeconds,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось прочитать файл");
    } finally {
      setIsParsing(false);
    }
  };

  const clearPending = () => {
    if (pendingUpload?.previewUrl) URL.revokeObjectURL(pendingUpload.previewUrl);
    setPendingUpload(null);
  };

  const handleConfirmUpload = async (draft: {
    title: string;
    artist: string;
    durationSeconds: number | null;
  }) => {
    if (!pendingUpload) return;
    const created = await confirmUpload(
      pendingUpload.file,
      {
        title: draft.title,
        artist: draft.artist,
        durationSeconds: pendingUpload.durationSeconds ?? draft.durationSeconds,
      },
      { pinToProfile: false },
    );
    if (created) {
      clearPending();
      onSelect(created);
      onClose();
    }
  };

  const handleClose = () => {
    clearPending();
    onClose();
  };

  return createPortal(
    <div
      className="voople-chat-music-sheet fixed inset-0 z-[115] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="voople-chat-music-sheet__panel w-full max-w-md rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-md)]"
        role="dialog"
        aria-label="Прикрепить музыку"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">Прикрепить трек</p>
          <button
            type="button"
            className="rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
            aria-label="Закрыть"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {pendingUpload ? (
          <TrackMetadataConfirmCard
            initialTitle={pendingUpload.title}
            initialArtist={pendingUpload.artist}
            heading="Новый трек"
            confirmLabel="Прикрепить"
            isSubmitting={isUploading}
            error={error}
            onCancel={clearPending}
            onConfirm={(draft) => void handleConfirmUpload(draft)}
            className="mb-3"
          />
        ) : (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Быстрый поиск"
              className="voople-input mb-3 text-sm"
            />

            <button
              type="button"
              disabled={isUploading || isParsing}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-[var(--app-radius-md)] border border-dashed border-[var(--app-border)] py-2.5 text-sm text-[var(--app-muted)] hover:border-[var(--theme-accent)] hover:text-[var(--foreground)]"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {isParsing ? "Читаем теги…" : isUploading ? "Загрузка…" : "Загрузить с устройства"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/m4a,audio/ogg,audio/wav,audio/webm"
              className="sr-only"
              onChange={(e) => {
                void handleFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

            {isLoading && <p className="text-sm text-[var(--app-muted)]">Загрузка плейлиста…</p>}

            {!isLoading && tracks.length === 0 && (
              <p className="text-sm text-[var(--app-muted)]">Нет треков. Загрузите файл выше.</p>
            )}

            <ul className={cn("max-h-52 space-y-1 overflow-y-auto voople-scroll")}>
              {tracks.map((track) => (
                <li key={track.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-[var(--app-radius-md)] px-2 py-2 text-left text-sm hover:bg-[var(--app-surface-soft)]"
                    onClick={() => {
                      onSelect(track);
                      onClose();
                    }}
                  >
                    <Music className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" />
                    <span className="min-w-0 flex-1 truncate">
                      {track.title}
                      <span className="text-[var(--app-muted)]"> · {track.artist}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--theme-accent)]">Прикрепить</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
