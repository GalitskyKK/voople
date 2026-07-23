"use client";

import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";

import { usePathname } from "next/navigation";

import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { useMobilePlayerAutoCollapse } from "@/hooks/useMobilePlayerAutoCollapse";
import { formatPlaybackTime } from "@/lib/player/format";
import { MOBILE_PLAYER_BOTTOM, MOBILE_PLAYER_BOTTOM_COMPACT } from "@/lib/layout/mobile-chrome";
import { isMessagesThreadPath } from "@/lib/layout/messages-path";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player.store";
import { usePlaylistUiStore } from "@/stores/playlist-ui.store";
import { PlayerProgressBar } from "./PlayerProgressBar";
import { PlayerTrackIdentity } from "./PlayerTrackArtwork";
import { PlayerVolumeControl } from "./PlayerVolumeControl";

type GlobalPlayerProps = {
  variant: "mobile" | "desktop";
};

export function GlobalPlayer({ variant }: GlobalPlayerProps) {
  const pathname = usePathname();
  const isLg = useIsLgViewport();
  const mobilePlayerBottom =
    variant === "mobile" && !isLg && isMessagesThreadPath(pathname)
      ? MOBILE_PLAYER_BOTTOM_COMPACT
      : MOBILE_PLAYER_BOTTOM;

  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const expanded = usePlayerStore((s) => s.expanded);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const stop = usePlayerStore((s) => s.stop);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const openPlaylist = usePlaylistUiStore((s) => s.openPlaylist);
  const sourceUsername = usePlayerStore((s) => s.sourceUsername);

  const isMobile = variant === "mobile";
  const { mobileExpanded, touch: touchMobilePlayer } = useMobilePlayerAutoCollapse(
    isMobile ? current?.id : undefined,
  );

  if (!current) return null;

  const seek = (time: number) => {
    setCurrentTime(time);
    const audio = document.querySelector<HTMLAudioElement>("audio[data-voople-audio]");
    if (audio) audio.currentTime = time;
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    prev();
  };

  const handleMobilePointerDown = () => {
    touchMobilePlayer();
  };

  if (isMobile) {
    return (
      <div
        className="pointer-events-none fixed left-0 right-0 z-[29] flex justify-center px-3 lg:hidden"
        style={{ bottom: mobilePlayerBottom }}
      >
        <div
          role="presentation"
          onPointerDown={handleMobilePointerDown}
          className={cn(
            "pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] shadow-[var(--app-shadow-nav)] backdrop-blur-xl transition-[max-height] duration-200",
            mobileExpanded ? "max-h-40" : "max-h-14",
          )}
        >
          {mobileExpanded ? (
            <div className="px-3 py-2">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    touchMobilePlayer();
                    if (sourceUsername) openPlaylist(sourceUsername, current.id);
                  }}
                  disabled={!sourceUsername}
                  className="min-w-0 flex-1 text-left"
                >
                  <PlayerTrackIdentity track={current} artworkClassName="h-9 w-9 rounded-lg" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stop();
                  }}
                  className="shrink-0 rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]"
                  aria-label="Закрыть плеер"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <PlayerProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
              <div className="mt-2 flex items-center gap-2">
                <span className="w-9 shrink-0 text-[10px] tabular-nums text-[var(--app-muted)]">
                  {formatPlaybackTime(currentTime)}
                </span>
                <div className="flex flex-1 items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      touchMobilePlayer();
                      handlePrev();
                    }}
                    className="text-[var(--app-muted)]"
                    aria-label="Назад"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      touchMobilePlayer();
                      togglePlay();
                    }}
                    className="text-[var(--foreground)]"
                    aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      touchMobilePlayer();
                      next();
                    }}
                    className="text-[var(--app-muted)]"
                    aria-label="Вперёд"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <PlayerVolumeControl compact mode="popover" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  touchMobilePlayer();
                  togglePlay();
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent)] text-[var(--foreground)]"
                aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  touchMobilePlayer();
                  if (sourceUsername) openPlaylist(sourceUsername, current.id);
                }}
                disabled={!sourceUsername}
                className="min-w-0 flex-1 text-left"
              >
                <PlayerTrackIdentity track={current} artworkClassName="h-8 w-8 rounded-lg" />
              </button>
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--app-muted)]">
                {formatPlaybackTime(currentTime)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stop();
                }}
                className="shrink-0 rounded-full p-1 text-[var(--app-muted)]"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
              <PlayerProgressBar
                currentTime={currentTime}
                duration={duration}
                onSeek={(t) => {
                  touchMobilePlayer();
                  seek(t);
                }}
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-none"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden shrink-0 border-t border-[var(--app-border)] px-3 py-3 lg:block">
      <div
        className={cn(
          "overflow-hidden rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] shadow-[var(--app-shadow-sm)] transition-[max-height] duration-200",
          expanded ? "max-h-40" : "max-h-28",
        )}
      >
        <div className="flex items-center gap-2 px-2.5 pt-2.5">
          <button
            type="button"
            onClick={() => sourceUsername && openPlaylist(sourceUsername, current.id)}
            disabled={!sourceUsername}
            className="min-w-0 flex-1 text-left"
          >
            <PlayerTrackIdentity track={current} artworkClassName="h-9 w-9 rounded-lg" />
          </button>
          <button type="button" onClick={stop} className="rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <PlayerProgressBar currentTime={currentTime} duration={duration} onSeek={seek} className="mx-2.5 mt-2 w-auto h-1" />

        <div className="flex items-center gap-2 px-2.5 py-2">
          <button type="button" onClick={handlePrev} className="rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Назад">
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--theme-accent)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
            aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
          </button>
          <button type="button" onClick={next} className="rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]" aria-label="Вперёд">
            <SkipForward className="h-4 w-4" />
          </button>
          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-[var(--app-muted)]">
            {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]"
            aria-label={expanded ? "Свернуть" : "Развернуть"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {expanded ? (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--app-border)] px-3 py-2">
            <span className="text-[10px] text-[var(--app-muted)]">
              {queue.length > 1 ? `В очереди ${Math.max(1, queueIndex + 1)} из ${queue.length}` : "Один трек"}
            </span>
            <PlayerVolumeControl compact />
          </div>
        ) : null}
      </div>
    </div>
  );
}
