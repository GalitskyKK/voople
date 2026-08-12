"use client";

import { useCallback } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { resolveRingStyle } from "@/lib/customization/rings";
import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView } from "@/types/chat";

export function VoiceParticipantCard({
  participant,
  muted,
  speaking,
  volume,
  hasCamera,
  onCameraContainerChange,
  onVolumeChange,
  compact = false,
  focused = false,
  onFocus,
  className,
}: {
  participant: ChatRoomParticipantView;
  muted: boolean;
  speaking: boolean;
  volume: number;
  hasCamera: boolean;
  onCameraContainerChange: (
    participantId: string,
    element: HTMLDivElement | null,
  ) => void;
  onVolumeChange: (volume: number) => void;
  compact?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  className?: string;
}) {
  const volumePercent = Math.round(volume * 100);
  const bindCameraContainer = useCallback(
    (element: HTMLDivElement | null) => {
      onCameraContainerChange(participant.id, element);
    },
    [onCameraContainerChange, participant.id],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-end overflow-hidden rounded-2xl border bg-[var(--app-surface-soft)] text-center transition",
        compact ? "min-h-32 gap-2 px-3 py-3" : "min-h-44 gap-3 px-4 py-4",
        focused && "col-span-2 h-full min-h-64 border-(--theme-accent) lg:col-span-4",
        speaking ? "border-emerald-500/50" : "border-[var(--app-border)]",
        className,
      )}
    >
      <div
        ref={bindCameraContainer}
        className="absolute inset-0"
        aria-hidden={!hasCamera}
      />
      {hasCamera && onFocus ? (
        <button
          type="button"
          className="absolute inset-0 z-[5] cursor-zoom-in"
          onClick={onFocus}
          aria-label={`Показать камеру ${participant.displayName} крупно`}
        />
      ) : null}
      {hasCamera ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/15" />
      ) : null}

      {!hasCamera ? (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <ProfileAvatarVisual
            displayName={participant.displayName}
            size="lg"
            isOnline
            ringClassName={resolveRingStyle(participant.avatarRingId)?.className}
            avatarImage={
              participant.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- shared animated avatar for Next.js and Tauri
                <img
                  src={participant.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : undefined
            }
            decorationImage={
              participant.avatarDecorationUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- shared animated decoration for Next.js and Tauri
                <img
                  src={participant.avatarDecorationUrl}
                  alt=""
                  className="h-full w-full max-w-none object-contain object-center"
                />
              ) : undefined
            }
          />
        </div>
      ) : null}

      <div className={cn("relative z-10 min-w-0 max-w-full", hasCamera && "text-white")}>
        <p className="truncate text-sm font-medium">
          {participant.displayName}
          {participant.isMe ? " · вы" : ""}
        </p>
        <p className={cn("truncate text-xs", hasCamera ? "text-white/70" : "text-[var(--app-muted)]")}>
          {speaking ? "говорит" : `@${participant.username}`}
        </p>
      </div>
      {muted ? (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-1.5 text-white/80">
          <MicOff className="h-4 w-4" aria-label="Микрофон выключен" />
        </span>
      ) : (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-1.5 text-emerald-400">
          <Mic className="h-4 w-4" aria-label="Микрофон включён" />
        </span>
      )}

      {!participant.isMe ? (
        <label
          className={cn(
            "relative z-10 flex w-full items-center gap-2 text-xs",
            hasCamera ? "text-white/80" : "text-[var(--app-muted)]",
          )}
        >
          <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Громкость {participant.displayName}</span>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={volumePercent}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
            className="min-w-0 flex-1 accent-[var(--theme-accent)]"
            aria-label={`Громкость ${participant.displayName}: ${volumePercent}%`}
          />
          <span className="w-9 text-right tabular-nums">{volumePercent}%</span>
        </label>
      ) : null}
    </div>
  );
}
