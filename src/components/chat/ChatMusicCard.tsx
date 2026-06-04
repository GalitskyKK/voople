"use client";

import { Pause, Play } from "lucide-react";

import { usePlayerStore } from "@/stores/player.store";
import type { PlaylistTrackView } from "@/types/playlist";
import { cn } from "@/lib/utils";

type ChatMusicCardProps = {
  title: string;
  subtitle: string;
  isMine: boolean;
  messageId: string;
  track?: PlaylistTrackView;
  streamUrl?: string;
};

export function ChatMusicCard({
  title,
  subtitle,
  isMine,
  messageId,
  track,
  streamUrl,
}: ChatMusicCardProps) {
  const play = usePlayerStore((s) => s.play);
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const isActive = track ? current?.id === track.id : current?.streamUrl === streamUrl;
  const playing = Boolean(isActive && isPlaying);

  const handlePlay = () => {
    if (track) {
      play(track);
      return;
    }
    if (streamUrl) {
      play({
        id: messageId,
        title,
        artist: subtitle,
        streamUrl,
        durationSeconds: null,
      });
    }
  };

  return (
    <div
      className={cn(
        "voople-chat-music flex min-w-[14rem] max-w-full items-center gap-2.5 rounded-[var(--app-radius-md)] border px-2.5 py-2",
        isMine
          ? "border-[color-mix(in_srgb,var(--theme-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)]"
          : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
      )}
    >
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[var(--foreground)]"
        aria-label={playing ? "Пауза" : "Слушать"}
        onClick={handlePlay}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-[var(--app-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}
