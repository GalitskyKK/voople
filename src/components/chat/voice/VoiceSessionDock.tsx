"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  GripVertical,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { cn } from "@/lib/utils";
import type { MediaStatus } from "./voice-room-config";

type VoiceSessionDockProps = {
  chatName: string;
  participantCount: number;
  durationLabel: string | null;
  mediaStatus: MediaStatus;
  connectionLabel: string | null;
  connectionQuality: ConnectionQuality;
  micMuted: boolean;
  outputMuted: boolean;
  mediaActionPending: boolean;
  leavePending: boolean;
  mediaPreview?: ReactNode;
  onOpen: () => void;
  onToggleMic: () => void;
  onToggleOutput: () => void;
  onLeave: () => void;
};

export function VoiceSessionDock({
  chatName,
  participantCount,
  durationLabel,
  mediaStatus,
  connectionLabel,
  connectionQuality,
  micMuted,
  outputMuted,
  mediaActionPending,
  leavePending,
  mediaPreview,
  onOpen,
  onToggleMic,
  onToggleOutput,
  onLeave,
}: VoiceSessionDockProps) {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const weakConnection =
    connectionQuality === ConnectionQuality.Poor ||
    connectionQuality === ConnectionQuality.Lost;

  return (
    <div
      ref={dockRef}
      className={cn(
        "voople-voice-dock fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-[70] flex w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col gap-2 rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,transparent)] p-2 shadow-[var(--app-shadow-nav)] backdrop-blur-xl lg:bottom-4",
        mediaPreview ? "max-w-sm" : "max-w-lg",
      )}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
      role="region"
      aria-label="Текущий голосовой разговор"
    >
      {mediaPreview}
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          className="grid h-10 w-5 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] active:cursor-grabbing"
          aria-label="Переместить окно разговора"
          title="Перетащите окно разговора"
          onDoubleClick={() => setOffset({ x: 0, y: 0 })}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: offset.x,
              originY: offset.y,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            const dock = dockRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !dock) return;
            const rect = dock.getBoundingClientRect();
            const baseLeft = rect.left - offset.x;
            const baseTop = rect.top - offset.y;
            const baseRight = rect.right - offset.x;
            const baseBottom = rect.bottom - offset.y;
            const nextX = drag.originX + event.clientX - drag.startX;
            const nextY = drag.originY + event.clientY - drag.startY;
            setOffset({
              x: Math.min(
                Math.max(nextX, 8 - baseLeft),
                window.innerWidth - 8 - baseRight,
              ),
              y: Math.min(
                Math.max(nextY, 8 - baseTop),
                window.innerHeight - 8 - baseBottom,
              ),
            });
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) {
              dragRef.current = null;
            }
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-[var(--app-surface-soft)]"
      >
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full",
            mediaStatus === "connected"
              ? "bg-emerald-500/12 text-emerald-500"
              : "bg-amber-500/12 text-amber-500",
          )}
        >
          {weakConnection ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{chatName}</span>
          <span className="block truncate text-xs text-[var(--app-muted)]">
            {mediaStatus === "connected"
              ? `${participantCount} в разговоре${durationLabel ? ` · ${durationLabel}` : ""}`
              : connectionLabel ?? "Подключаем…"}
          </span>
        </span>
      </button>

      <button
        type="button"
        disabled={mediaActionPending || mediaStatus !== "connected"}
        onClick={onToggleMic}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition disabled:opacity-50",
          micMuted
            ? "border-red-500/25 bg-red-500/10 text-red-500"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-emerald-500",
        )}
        aria-label={micMuted ? "Включить микрофон" : "Выключить микрофон"}
      >
        {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onToggleOutput}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition",
          outputMuted
            ? "border-red-500/25 bg-red-500/10 text-red-500"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-muted)]",
        )}
        aria-label={outputMuted ? "Включить звук собеседников" : "Выключить звук собеседников"}
      >
        {outputMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-muted)] transition hover:text-[var(--foreground)]"
        aria-label="Участники и настройки"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={leavePending}
        onClick={onLeave}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500 text-white transition hover:bg-red-400 disabled:opacity-50"
        aria-label="Выйти из разговора"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}
