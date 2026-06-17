"use client";

import { ChevronRight, MessageCircle, Music, Sparkles } from "lucide-react";

import { MoodSlider } from "@/components/profile/MoodSlider";
import { usePlaylistUiStore } from "@/stores/playlist-ui.store";
import type { StatusPostPayload } from "@/types/domain";
import { cn } from "@/lib/utils";

type StatusPostBodyProps = {
  status: StatusPostPayload;
  authorUsername: string;
  className?: string;
};

/** Published status snapshot (read-only in feed). */
export function StatusPostBody({ status, authorUsername, className }: StatusPostBodyProps) {
  const hasMood = status.moodValue != null && status.moodValue > 0;
  const hasThought = Boolean(status.thought?.trim());
  const hasTrack = Boolean(
    status.trackId || status.trackTitle?.trim() || status.trackArtist?.trim(),
  );
  const openPlaylist = usePlaylistUiStore((s) => s.openPlaylist);

  return (
    <div
      className={cn(
        "voople-status-post space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--foreground)_6%,transparent)] to-transparent p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
        <Sparkles className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
        <span>Состояние</span>
      </div>
      {hasMood && (
        <div className="voople-status-post__mood rounded-lg bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2">
          <MoodSlider value={status.moodValue} readOnly />
        </div>
      )}
      {hasThought && (
        <blockquote className="voople-status-post__thought flex gap-3 border-l-2 border-[var(--theme-accent)] pl-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
          <p className="text-sm italic leading-relaxed text-[color-mix(in_srgb,var(--foreground)_85%,transparent)]">{status.thought}</p>
        </blockquote>
      )}
      {hasTrack && (
        <button
          type="button"
          onClick={() => openPlaylist(authorUsername, status.trackId ?? null)}
          className="voople-status-post__track flex w-full items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]">
            <Music className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {status.trackArtist && status.trackTitle
                ? `${status.trackArtist} – ${status.trackTitle}`
                : status.trackTitle || status.trackArtist}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]" aria-hidden />
        </button>
      )}
    </div>
  );
}
