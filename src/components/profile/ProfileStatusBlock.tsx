"use client";

import { ChevronRight, Music2 } from "lucide-react";
import type { CSSProperties } from "react";

import { getMoodColor, getMoodEmoji, getMoodLabel } from "@/lib/constants/mood";
import { cn } from "@/lib/utils";
import type { ProfileStatus } from "@/types/domain";
import { MoodSlider } from "./MoodSlider";
import { MoodLevelMeter } from "./MoodLevelMeter";

type ProfileStatusBlockProps = {
  status: ProfileStatus;
  editable?: boolean;
  showEmptyFields?: boolean;
  showMusicForOwner?: boolean;
  onMoodChange?: (value: number) => void;
  onThoughtChange?: (thought: string) => void;
  onMusicClick?: () => void;
  onExpand?: () => void;
};

export function ProfileStatusBlock({
  status,
  editable = false,
  showEmptyFields = false,
  showMusicForOwner = false,
  onMoodChange,
  onThoughtChange,
  onMusicClick,
  onExpand,
}: ProfileStatusBlockProps) {
  const hasMood = status.moodValue != null && status.moodValue > 0;
  const hasThought = Boolean(status.thought?.trim());
  const hasTrack = Boolean(status.trackId || status.trackTitle?.trim() || status.trackArtist?.trim());
  const moodValue = status.moodValue ?? 5;
  const showThought = hasThought || (editable && showEmptyFields);
  const showTrack = hasTrack || showMusicForOwner;

  if (!hasMood && !showThought && !showTrack && !editable) return null;

  const trackLabel =
    status.trackArtist && status.trackTitle
      ? `${status.trackArtist} – ${status.trackTitle}`
      : status.trackTitle || status.trackArtist || "Добавить музыку";
  const moodStyle = { "--mood-color": getMoodColor(moodValue) } as CSSProperties;

  return (
    <div
      className={cn("voople-mood-card relative overflow-hidden", onExpand && "cursor-pointer")}
      style={moodStyle}
      onClick={onExpand ? (event) => {
        if ((event.target as Element).closest("button,input")) return;
        onExpand();
      } : undefined}
    >
      <div className="relative z-[1]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="voople-mood-card__emoji" aria-hidden>{getMoodEmoji(moodValue)}</span>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
            {getMoodLabel(moodValue)}
          </p>
          {onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--app-muted)] transition hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:text-[var(--foreground)]"
              aria-label="Открыть момент"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {editable ? (
          <MoodSlider value={moodValue} onChange={onMoodChange} />
        ) : hasMood ? (
          <MoodLevelMeter value={moodValue} color={getMoodColor(moodValue)} className="mt-2" />
        ) : null}

        {showThought ? (
          <div className="voople-mood-card__thought mt-2">
            {editable ? (
              <input
                type="text"
                value={status.thought ?? ""}
                onChange={(event) => onThoughtChange?.(event.target.value)}
                placeholder="Что сейчас не выходит из головы?"
                maxLength={80}
                className="w-full min-w-0 bg-transparent text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_82%,transparent)] outline-none placeholder:text-[color-mix(in_srgb,var(--foreground)_32%,transparent)]"
                aria-label="Фраза момента"
              />
            ) : (
              <p className="min-w-0 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]">{status.thought}</p>
            )}
          </div>
        ) : null}

        {showTrack ? (
          <button
            type="button"
            onClick={onMusicClick}
            className="voople-mood-card__track mt-2 flex w-full items-center gap-2 px-1 py-1.5 text-left transition-colors hover:text-[var(--foreground)]"
          >
            <Music2 className="h-3.5 w-3.5 shrink-0 text-[var(--mood-color)]" />
            <span className="min-w-0 flex-1 truncate text-xs text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">{trackLabel}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color-mix(in_srgb,var(--foreground)_34%,transparent)]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
