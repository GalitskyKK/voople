"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  Scaling,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { cn } from "@/lib/utils";
import type { MediaStatus } from "./voice-room-config";
import { useVoiceDockGeometry } from "./useVoiceDockGeometry";

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

type VoiceDockMode = "mini" | "compact" | "minimal";
const DOCK_MODE_KEY = "voople:voice-dock-mode:v1";

function initialDockMode(): VoiceDockMode {
  if (typeof window === "undefined") return "mini";
  const stored = window.localStorage.getItem(DOCK_MODE_KEY);
  return stored === "compact" || stored === "minimal" ? stored : "mini";
}

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
  const geometry = useVoiceDockGeometry(dockRef);
  const [mode, setMode] = useState<VoiceDockMode>(initialDockMode);
  const weakConnection =
    connectionQuality === ConnectionQuality.Poor ||
    connectionQuality === ConnectionQuality.Lost;

  useEffect(() => {
    window.localStorage.setItem(DOCK_MODE_KEY, mode);
  }, [mode]);

  if (mode === "minimal") {
    return (
      <button
        type="button"
        onClick={() => setMode("compact")}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-3 z-[70] grid h-12 w-12 place-items-center rounded-full border bg-[var(--app-surface)] shadow-[var(--app-shadow-nav)] transition hover:scale-105 lg:bottom-4",
          mediaStatus === "connected" ? "border-emerald-500/40 text-emerald-500" : "border-amber-500/40 text-amber-500",
        )}
        aria-label={`Развернуть разговор ${chatName}`}
        title={`${chatName}${durationLabel ? ` · ${durationLabel}` : ""}`}
      >
        {weakConnection ? <WifiOff className="h-5 w-5" /> : micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)] bg-emerald-500" />
      </button>
    );
  }

  if (mode === "compact") {
    return (
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-[70] flex h-[52px] w-[min(440px,calc(100vw-1rem))] -translate-x-1/2 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] p-1.5 shadow-[var(--app-shadow-nav)] backdrop-blur-xl lg:bottom-4" role="region" aria-label="Компактный голосовой разговор">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-left hover:bg-[var(--app-surface-soft)]">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", mediaStatus === "connected" ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="min-w-0"><span className="block truncate text-xs font-semibold">{chatName}</span><span className="block text-[10px] text-[var(--app-muted)]">{participantCount} · {durationLabel ?? connectionLabel ?? "Подключаем…"}</span></span>
        </button>
        <button type="button" onClick={onToggleMic} disabled={mediaActionPending || mediaStatus !== "connected"} className={cn("grid h-9 w-9 place-items-center rounded-full", micMuted ? "bg-red-500/10 text-red-500" : "bg-[var(--theme-accent)] text-white")} aria-label={micMuted ? "Включить микрофон" : "Выключить микрофон"}>{micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
        <button type="button" onClick={() => setMode("mini")} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]" aria-label="Развернуть мини-комнату"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => setMode("minimal")} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]" aria-label="Свернуть до индикатора"><ChevronDown className="h-4 w-4" /></button>
        <button type="button" disabled={leavePending} onClick={onLeave} className="grid h-9 w-9 place-items-center rounded-xl bg-red-500 text-white disabled:opacity-50" aria-label="Выйти из разговора"><PhoneOff className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div
      ref={dockRef}
      className={cn(
        "voople-voice-dock fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-[70] flex -translate-x-1/2 flex-col gap-2 rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,transparent)] p-2 shadow-[var(--app-shadow-nav)] backdrop-blur-xl lg:bottom-4",
      )}
      style={geometry.style}
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
          onDoubleClick={geometry.resetPosition}
          onPointerDown={geometry.startMove}
          onPointerMove={geometry.updateGesture}
          onPointerUp={geometry.endGesture}
          onPointerCancel={geometry.cancelGesture}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode("compact")}
          className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
          aria-label="Свернуть разговор"
          title="Компактный режим"
        >
          <ChevronDown className="h-4 w-4" />
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
            : "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white",
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
      <button
        type="button"
        className="absolute bottom-1 right-1 z-10 grid h-6 w-6 touch-none cursor-nwse-resize place-items-center rounded-md text-[var(--app-muted)] opacity-45 transition hover:bg-[var(--app-surface-soft)] hover:opacity-100"
        aria-label="Изменить размер окна разговора"
        title="Потяните, чтобы изменить размер"
        onPointerDown={geometry.startResize}
        onPointerMove={geometry.updateGesture}
        onPointerUp={geometry.endGesture}
        onPointerCancel={geometry.cancelGesture}
      >
        <Scaling className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
