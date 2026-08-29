"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Mic, MicOff } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { resolveRingStyle } from "@/lib/customization/rings";
import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView } from "@/types/chat";
import { VoiceParticipantContextMenu } from "./VoiceParticipantContextMenu";

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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const bindCameraContainer = useCallback(
    (element: HTMLDivElement | null) => {
      onCameraContainerChange(participant.id, element);
    },
    [onCameraContainerChange, participant.id],
  );
  const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (participant.isMe) return;
    event.preventDefault();
    setMenuPoint({ x: event.clientX, y: event.clientY });
  };
  const openContextMenuFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (participant.isMe || (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))) return;
    event.preventDefault();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) setMenuPoint({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <>
      <div
        ref={cardRef}
        role={participant.isMe ? undefined : "group"}
        tabIndex={participant.isMe ? undefined : 0}
        aria-haspopup={participant.isMe ? undefined : "menu"}
        aria-label={participant.isMe ? undefined : `${participant.displayName}. Контекстное меню — Shift+F10`}
        onContextMenu={openContextMenu}
        onKeyDown={openContextMenuFromKeyboard}
        className={cn(
          "relative flex flex-col items-center justify-end overflow-hidden rounded-2xl border bg-[var(--app-surface-soft)] text-center outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]",
          compact ? "min-h-32 gap-2 px-3 py-3" : "min-h-44 gap-3 px-4 py-4",
          focused && "col-span-2 h-full min-h-64 border-(--theme-accent) lg:col-span-4",
          speaking ? "border-[var(--theme-accent)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--theme-accent)_20%,transparent)]" : "border-[var(--app-border)]",
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
        <span className="absolute right-3 top-3 z-10 rounded-full bg-[var(--theme-accent)] p-1.5 text-white">
          <Mic className="h-4 w-4" aria-label="Микрофон включён" />
        </span>
      )}

      </div>
      {!participant.isMe ? (
        <VoiceParticipantContextMenu
          participant={participant}
          open={Boolean(menuPoint)}
          anchorPoint={menuPoint}
          volume={volume}
          onOpenChange={(open) => {
            if (!open) {
              setMenuPoint(null);
              cardRef.current?.focus({ preventScroll: true });
            }
          }}
          onVolumeChange={onVolumeChange}
        />
      ) : null}
    </>
  );
}
