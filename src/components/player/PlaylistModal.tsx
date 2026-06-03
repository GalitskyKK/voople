"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Pause, Play, Trash2, X } from "lucide-react";

import { Sheet } from "@/components/ui/Sheet";
import { formatPlaybackTime } from "@/lib/player/format";
import { readTrackMetadata } from "@/lib/player/metadata";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useAudioUpload } from "@/hooks/useAudioUpload";
import { usePlayerStore } from "@/stores/player.store";
import { usePlaylistUiStore } from "@/stores/playlist-ui.store";
import type { PlaylistTrackView } from "@/types/playlist";
import { TrackUploadConfirm, type PendingTrackUpload } from "./TrackUploadConfirm";

function TrackMeta({
  track,
  currentTime,
  duration,
  isActive,
  isPlaying,
}: {
  track: PlaylistTrackView;
  currentTime: number;
  duration: number;
  isActive: boolean;
  isPlaying: boolean;
}) {
  if (isActive && isPlaying) {
    const total = duration || track.durationSeconds || 0;
    return (
      <p className="text-xs text-[var(--app-muted)]">
        {formatPlaybackTime(currentTime)} / {formatPlaybackTime(total)}
      </p>
    );
  }
  if (track.durationSeconds) {
    return <p className="text-xs text-[var(--app-muted)]">{formatPlaybackTime(track.durationSeconds)}</p>;
  }
  return null;
}

export function PlaylistModal() {
  const open = usePlaylistUiStore((s) => s.open);
  const username = usePlaylistUiStore((s) => s.username);
  const focusTrackId = usePlaylistUiStore((s) => s.focusTrackId);
  const closePlaylist = usePlaylistUiStore((s) => s.closePlaylist);

  const { data: me } = trpc.user.me.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const isOwner = Boolean(me?.username && username && me.username === username);

  const playlistQuery = trpc.playlist.listByUsername.useQuery(
    { username: username ?? "" },
    { enabled: open && Boolean(username) },
  );

  const utils = trpc.useUtils();
  const setAnthem = trpc.playlist.setAnthem.useMutation({
    onSuccess: () => {
      if (username) void utils.playlist.listByUsername.invalidate({ username });
      void utils.profile.getByUsername.invalidate({ username: username ?? "" });
    },
  });
  const removeTrack = trpc.playlist.remove.useMutation({
    onSuccess: () => {
      if (username) void utils.playlist.listByUsername.invalidate({ username });
    },
  });

  const { confirmUpload, isUploading, error, setError } = useAudioUpload();
  const [pendingUpload, setPendingUpload] = useState<PendingTrackUpload | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const tracks = playlistQuery.data?.tracks ?? [];
  const anthemTrackId = playlistQuery.data?.anthemTrackId ?? null;

  const orderedTracks = useMemo(() => {
    if (!focusTrackId) return tracks;
    const idx = tracks.findIndex((t) => t.id === focusTrackId);
    if (idx <= 0) return tracks;
    return [tracks[idx]!, ...tracks.filter((_, i) => i !== idx)];
  }, [tracks, focusTrackId]);

  const clearPending = useCallback(() => {
    setPendingUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setError(null);
  }, [setError]);

  useEffect(() => {
    if (!open) clearPending();
  }, [open, clearPending]);

  if (!open || !username) return null;

  const playlistUsername = username;
  const empty = !playlistQuery.isLoading && tracks.length === 0;

  const handlePlay = (track: PlaylistTrackView) => {
    if (current?.id === track.id) {
      togglePlay();
      return;
    }
    play(track, {
      queue: orderedTracks,
      queueIndex: orderedTracks.findIndex((t) => t.id === track.id),
      sourceUsername: playlistUsername,
    });
  };

  const handleFileSelected = async (file: File) => {
    setError(null);
    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    const allowed = new Set([
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/m4a",
      "audio/ogg",
      "audio/wav",
      "audio/webm",
      "audio/x-m4a",
    ]);
    if (!allowed.has(contentType)) {
      setError("Допустимы MP3, M4A, OGG, WAV или WebM");
      return;
    }

    setIsParsing(true);
    try {
      const meta = await readTrackMetadata(file);
      setPendingUpload((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          title: meta.title,
          artist: meta.artist,
          durationSeconds: meta.durationSeconds,
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось прочитать файл");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmUpload = async (draft: {
    title: string;
    artist: string;
    durationSeconds: number | null;
  }) => {
    if (!pendingUpload) return;
    const created = await confirmUpload(pendingUpload.file, draft, { pinToProfile: true });
    if (!created) return;
    clearPending();
    void utils.playlist.listByUsername.invalidate({ username: playlistUsername });
    void utils.profile.getByUsername.invalidate({ username: playlistUsername });
  };

  return (
    <Sheet open={open} onClose={closePlaylist} className="max-h-[min(85dvh,640px)] w-full max-w-md overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
        <button
          type="button"
          onClick={closePlaylist}
          className="rounded-[var(--app-radius-sm)] p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          aria-label="Назад"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-base font-semibold text-[var(--foreground)]">Плейлист</h2>
        <button
          type="button"
          onClick={closePlaylist}
          className="rounded-[var(--app-radius-sm)] p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="voople-scroll max-h-[calc(min(85dvh,640px)-56px)] overflow-y-auto px-2 py-2">
        {isOwner && pendingUpload && (
          <div className="px-2">
            <TrackUploadConfirm
              pending={pendingUpload}
              isSubmitting={isUploading}
              error={error}
              onCancel={clearPending}
              onConfirm={handleConfirmUpload}
            />
          </div>
        )}

        {isOwner && !pendingUpload && (
          <div className="mb-3 px-2">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-5 text-center transition-colors",
                !isParsing && !isUploading && "hover:border-[var(--theme-accent)]",
                (isParsing || isUploading) && "pointer-events-none opacity-60",
              )}
            >
              <span className="text-sm font-medium text-[var(--foreground)]">
                {isParsing ? "Читаем теги…" : empty ? "Загрузить трек" : "Добавить трек"}
              </span>
              <span className="text-xs text-[var(--app-muted)]">MP3, M4A, OGG, WAV до 30 МБ</span>
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                disabled={isParsing || isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleFileSelected(file);
                }}
              />
            </label>
            {error && !pendingUpload && <p className="mt-2 text-xs text-red-500">{error}</p>}
          </div>
        )}

        {playlistQuery.isLoading && (
          <p className="px-4 py-8 text-center text-sm text-[var(--app-muted)]">Загрузка…</p>
        )}

        {!playlistQuery.isLoading && empty && !isOwner && (
          <p className="px-4 py-8 text-center text-sm text-[var(--app-muted)]">Нет треков</p>
        )}

        <ul className="flex flex-col gap-0.5">
          {orderedTracks.map((track) => {
            const active = current?.id === track.id;
            const playing = active && isPlaying;
            const pinned = track.id === anthemTrackId || track.id === focusTrackId;

            return (
              <li key={track.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5",
                    pinned && "bg-[var(--app-accent-soft)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handlePlay(track)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent)] text-white"
                    aria-label={playing ? "Пауза" : "Воспроизвести"}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlay(track)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {track.artist} – {track.title}
                    </p>
                    <TrackMeta
                      track={track}
                      currentTime={currentTime}
                      duration={duration}
                      isActive={active}
                      isPlaying={playing}
                    />
                  </button>
                  {isOwner && (
                    <div className="flex shrink-0 items-center gap-1">
                      {track.id !== anthemTrackId && (
                        <button
                          type="button"
                          disabled={setAnthem.isPending}
                          onClick={() => setAnthem.mutate({ trackId: track.id })}
                          className="rounded-[var(--app-radius-sm)] px-2 py-1 text-[10px] font-medium text-[var(--theme-accent)] hover:bg-[var(--app-surface-soft)]"
                        >
                          В профиль
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={removeTrack.isPending}
                        onClick={() => removeTrack.mutate({ trackId: track.id })}
                        className="rounded-[var(--app-radius-sm)] p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-red-500"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
