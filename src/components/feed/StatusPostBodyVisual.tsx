"use client";

import { ChevronRight, Music2 } from "lucide-react";
import type { CSSProperties } from "react";

import { getMoodColor, getMoodEmoji, getMoodLabel } from "@/lib/constants/mood";
import { cn } from "@/lib/utils";
import type { StatusPostPayload } from "@/types/domain";

type StatusPostBodyVisualProps = {
  status: StatusPostPayload;
  className?: string;
  onMusicClick?: () => void;
};

export function StatusPostBodyVisual({
  status,
  className,
  onMusicClick,
}: StatusPostBodyVisualProps) {
  const hasThought = Boolean(status.thought?.trim());
  const hasTrack = Boolean(
    status.trackId || status.trackTitle?.trim() || status.trackArtist?.trim(),
  );
  const moodValue = status.moodValue ?? 5;
  const moodStyle = {
    "--mood-color": getMoodColor(moodValue),
  } as CSSProperties;
  const trackContent = (
    <>
      <Music2 className="h-3.5 w-3.5 shrink-0 text-[var(--mood-color)]" />
      <span className="min-w-0 flex-1 truncate text-xs text-[color-mix(in_srgb,var(--foreground)_74%,transparent)]">
        {status.trackArtist && status.trackTitle
          ? `${status.trackArtist} – ${status.trackTitle}`
          : status.trackTitle || status.trackArtist}
      </span>
      {onMusicClick ? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color-mix(in_srgb,var(--foreground)_34%,transparent)]" />
      ) : null}
    </>
  );

  return (
    <div
      className={cn("voople-status-post relative overflow-hidden", className)}
      style={moodStyle}
    >
      <div className="relative z-[1]">
        <div className="flex items-start gap-3">
          <span className="voople-status-post__emoji" aria-hidden>
            {getMoodEmoji(moodValue)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-[color-mix(in_srgb,var(--foreground)_42%,transparent)]">
              в этот момент
            </span>
            <p className="mt-0.5 truncate text-[15px] font-semibold text-[var(--foreground)]">
              {getMoodLabel(moodValue)}
            </p>
          </div>
        </div>

        {hasThought ? (
          <div className="voople-status-post__thought mt-3 flex gap-2.5">
            <span
              aria-hidden
              className="-mt-1 shrink-0 font-serif text-3xl leading-none text-[var(--mood-color)]"
            >
              “
            </span>
            <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_86%,transparent)]">
              {status.thought}
            </p>
          </div>
        ) : null}

        {hasTrack ? (
          onMusicClick ? (
            <button
              type="button"
              onClick={onMusicClick}
              className="voople-status-post__track mt-3 flex w-full items-center gap-2 px-1 py-2 text-left transition-colors hover:text-[var(--foreground)]"
            >
              {trackContent}
            </button>
          ) : (
            <div className="voople-status-post__track mt-3 flex w-full items-center gap-2 px-1 py-2 text-left">
              {trackContent}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
