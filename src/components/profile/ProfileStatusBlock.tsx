"use client";

import { MessageCircle, Music } from "lucide-react";

import type { ProfileStatus } from "@/types/domain";
import { MoodSlider } from "./MoodSlider";

type ProfileStatusBlockProps = {
  status: ProfileStatus;
  editable?: boolean;
  showEmptyFields?: boolean;
  onMoodChange?: (value: number) => void;
  onThoughtChange?: (thought: string) => void;
  onTrackChange?: (title: string, artist: string) => void;
};

function StatusRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="voople-status-row flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-white/60">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ProfileStatusBlock({
  status,
  editable = false,
  showEmptyFields = false,
  onMoodChange,
  onThoughtChange,
  onTrackChange,
}: ProfileStatusBlockProps) {
  const hasMood = status.moodValue != null && status.moodValue > 0;
  const hasThought = Boolean(status.thought?.trim());
  const hasTrack = Boolean(status.trackTitle?.trim() || status.trackArtist?.trim());

  const showThought = hasThought || (editable && showEmptyFields);
  const showTrack = hasTrack || (editable && showEmptyFields);

  if (!hasMood && !showThought && !showTrack && !editable) return null;

  return (
    <div className="voople-profile-status__fields flex flex-col gap-2">
      {(hasMood || editable) && (
        <div className="voople-profile-status__mood rounded-xl bg-white/5 px-3 py-2.5">
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
              className="w-full bg-transparent text-sm italic text-white/70 outline-none placeholder:text-white/30"
              aria-label="Мысль"
            />
          ) : (
            <p className="text-sm italic text-white/70">{status.thought}</p>
          )}
        </StatusRow>
      )}
      {showTrack && (
        <StatusRow icon={<Music className="h-4 w-4" />}>
          {editable ? (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={status.trackTitle ?? ""}
                onChange={(e) =>
                  onTrackChange?.(e.target.value, status.trackArtist ?? "")
                }
                placeholder="Трек"
                maxLength={100}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                aria-label="Трек"
              />
              <input
                type="text"
                value={status.trackArtist ?? ""}
                onChange={(e) =>
                  onTrackChange?.(status.trackTitle ?? "", e.target.value)
                }
                placeholder="Исполнитель"
                maxLength={100}
                className="w-full bg-transparent text-xs text-white/50 outline-none placeholder:text-white/30"
                aria-label="Исполнитель"
              />
            </div>
          ) : (
            <p className="text-sm text-white/60">
              {status.trackArtist} — {status.trackTitle}
            </p>
          )}
        </StatusRow>
      )}
    </div>
  );
}
