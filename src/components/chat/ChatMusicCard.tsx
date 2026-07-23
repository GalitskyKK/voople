"use client";

import { Pause, Play } from "lucide-react";

import { usePlayerStore } from "@/stores/player.store";
import type { PlaylistTrackView } from "@/types/playlist";
import { cn } from "@/lib/utils";
import { PlayerTrackArtwork } from "@/components/player/PlayerTrackArtwork";

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
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const playableTrack: PlaylistTrackView | null = track ?? (streamUrl ? {
    id: messageId,
    title,
    artist: subtitle,
    streamUrl,
    durationSeconds: null,
  } : null);

  const isActive = Boolean(playableTrack && current?.id === playableTrack.id);
  const playing = Boolean(isActive && isPlaying);

  const handlePlay = () => {
    if (isActive) {
      togglePlay();
      return;
    }
    if (playableTrack) play(playableTrack);
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
        className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-white"
        aria-label={playing ? "Пауза" : "Слушать"}
        onClick={(event) => {
          event.stopPropagation();
          handlePlay();
        }}
      >
        {playableTrack ? <PlayerTrackArtwork track={playableTrack} className="absolute inset-0 h-full w-full rounded-xl" /> : null}
        <span className="absolute inset-0 bg-black/24" />
        {playing ? <Pause className="relative h-4 w-4" /> : <Play className="relative ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-[var(--app-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}
