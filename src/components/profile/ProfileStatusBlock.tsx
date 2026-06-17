"use client";

import { ChevronRight, MessageCircle, Music } from "lucide-react";

import type { ProfileStatus } from "@/types/domain";
import { MoodSlider } from "./MoodSlider";

type ProfileStatusBlockProps = {
  status: ProfileStatus;
  editable?: boolean;
  showEmptyFields?: boolean;
  showMusicForOwner?: boolean;
  onMoodChange?: (value: number) => void;
  onThoughtChange?: (thought: string) => void;
  onMusicClick?: () => void;
};

function StatusRow({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);

  return (
    <div
      className="voople-status-row flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2.5"
      {...(interactive
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            },
          }
        : {})}
    >
      <span className="mt-0.5 shrink-0 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {interactive && (
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]" aria-hidden />
      )}
    </div>
  );
}

export function ProfileStatusBlock({
  status,
  editable = false,
  showEmptyFields = false,
  showMusicForOwner = false,
  onMoodChange,
  onThoughtChange,
  onMusicClick,
}: ProfileStatusBlockProps) {
  const hasMood = status.moodValue != null && status.moodValue > 0;
  const hasThought = Boolean(status.thought?.trim());
  const hasTrack = Boolean(
    status.trackId || status.trackTitle?.trim() || status.trackArtist?.trim(),
  );

  const showThought = hasThought || (editable && showEmptyFields);
  const showTrack = hasTrack || showMusicForOwner;

  if (!hasMood && !showThought && !showTrack && !editable) return null;

  const trackLabel =
    status.trackArtist && status.trackTitle
      ? `${status.trackArtist} – ${status.trackTitle}`
      : status.trackTitle || status.trackArtist || "Музыка";

  return (
    <div className="voople-profile-status__fields flex flex-col gap-2">
      {(hasMood || editable) && (
        <div className="voople-profile-status__mood rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2.5">
          <MoodSlider
            value={status.moodValue ?? 5}
            onChange={editable ? onMoodChange : undefined}
          />
        </div>
      )}
      {showThought && (
        <StatusRow icon={<MessageCircle className="h-4 w-4" />}>
          {editable ? (
            <input
              type="text"
              value={status.thought ?? ""}
              onChange={(e) => onThoughtChange?.(e.target.value)}
              placeholder="О чём думаешь?"
              maxLength={80}
              className="w-full bg-transparent text-sm italic text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] outline-none placeholder:text-[color-mix(in_srgb,var(--foreground)_30%,transparent)]"
              aria-label="Мысль"
            />
          ) : (
            <p className="text-sm italic text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">{status.thought}</p>
          )}
        </StatusRow>
      )}
      {showTrack && (
        <StatusRow icon={<Music className="h-4 w-4" />} onClick={onMusicClick}>
          <p className={hasTrack ? "text-sm text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]" : "text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]"}>
            {hasTrack ? trackLabel : "Добавить музыку"}
          </p>
        </StatusRow>
      )}
    </div>
  );
}
