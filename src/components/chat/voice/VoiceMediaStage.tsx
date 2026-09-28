"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { VoiceScreenShareMenu } from "./VoiceScreenShareMenu";

type VoiceMediaStageProps = {
  screenContainerRef: (element: HTMLDivElement | null) => void;
  screenShareOwner: string | null;
  focused?: boolean;
  onFocus?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onStopWatching?: () => void;
  className?: string;
};

export function VoiceMediaStage({
  screenContainerRef,
  screenShareOwner,
  focused = false,
  onFocus,
  volume,
  onVolumeChange,
  onStopWatching,
  className,
}: VoiceMediaStageProps) {
  const stageRef = useRef<HTMLElement | null>(null);
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const showMenu = volume !== undefined && Boolean(onVolumeChange) && Boolean(onStopWatching);
  const openContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!showMenu) return;
    event.preventDefault();
    setMenuPoint({ x: event.clientX, y: event.clientY });
  };
  const openFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!showMenu || (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))) return;
    event.preventDefault();
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) setMenuPoint({ x: rect.right - 36, y: rect.top + 32 });
  };
  return (
    <section
      ref={stageRef}
      tabIndex={showMenu ? 0 : undefined}
      onContextMenu={showMenu ? openContextMenu : undefined}
      onKeyDown={showMenu ? openFromKeyboard : undefined}
      className={cn(
        screenShareOwner
          ? "voople-full-room__media relative grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[var(--app-radius-sm)] border bg-black transition"
          : "hidden",
        focused
          ? "col-span-2 min-h-64 border-(--theme-accent) lg:col-span-4"
          : "min-h-20 border-[var(--app-border)]",
        className,
      )}
      aria-label={screenShareOwner ? `Демонстрация экрана: ${screenShareOwner}` : undefined}
    >
      {onFocus ? (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in"
          onClick={onFocus}
          aria-label={`Показать демонстрацию ${screenShareOwner} крупно`}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-[2] flex items-start justify-between gap-2 text-xs text-white/85">
        <span className="min-w-0 truncate rounded-[var(--app-radius-sm)] bg-black/65 px-2.5 py-1.5 backdrop-blur-sm">{screenShareOwner}</span>
        <span className="flex shrink-0 items-center gap-1">
          {showMenu ? (
            <button
              type="button"
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-[var(--app-radius-sm)] bg-black/65 text-white/85 backdrop-blur-sm hover:bg-black/80 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              aria-label={`Параметры демонстрации ${screenShareOwner}`}
              aria-haspopup="dialog"
              aria-expanded={Boolean(menuPoint)}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setMenuPoint({ x: rect.right, y: rect.bottom });
              }}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
      <div
        ref={screenContainerRef}
        data-voople-screen-stage=""
        className={cn(
          "flex min-h-0 min-w-0 max-h-full max-w-full items-center justify-center overflow-hidden [&>video]:block [&>video]:h-full [&>video]:min-h-0 [&>video]:w-full [&>video]:min-w-0 [&>video]:max-h-full [&>video]:max-w-full [&>video]:object-contain [&>[data-livekit-local-screen]]:h-full [&>[data-livekit-local-screen]]:w-full",
          focused ? "self-stretch" : "aspect-video",
        )}
      />
      {showMenu && onVolumeChange && onStopWatching && screenShareOwner ? (
        <VoiceScreenShareMenu
          owner={screenShareOwner}
          open={Boolean(menuPoint)}
          anchorPoint={menuPoint}
          volume={volume}
          onOpenChange={(open) => {
            if (!open) {
              setMenuPoint(null);
              stageRef.current?.focus({ preventScroll: true });
            }
          }}
          onVolumeChange={onVolumeChange}
          onStopWatching={onStopWatching}
        />
      ) : null}
    </section>
  );
}
