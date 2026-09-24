"use client";

import { useRef } from "react";
import {
  ChevronDown,
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

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { reportProductEvent } from "@/lib/telemetry/client";
import { VoiceCompactSessionDock } from "./VoiceCompactSessionDock";
import { VoiceDockResizeHandles } from "./VoiceDockResizeHandles";
import { VoiceMinimalSessionDock } from "./VoiceMinimalSessionDock";
import type { VoiceSessionDockProps } from "./voice-session-dock-types";
import { useVoiceDockGeometry } from "./useVoiceDockGeometry";

export function VoiceSessionDock({
  mode,
  onModeChange,
  chatName,
  participantCount,
  activeSpeakerName,
  durationLabel,
  mediaStatus,
  connectionLabel,
  connectionQuality,
  micMuted,
  outputMuted,
  cameraEnabled,
  screenSharing,
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
  const weakConnection =
    connectionQuality === ConnectionQuality.Poor ||
    connectionQuality === ConnectionQuality.Lost;

  const changeMode = (next: typeof mode) => {
    onModeChange(next);
    reportProductEvent(next === "minimal" ? "room_minimized" : next === "compact" ? "room_compacted" : "room_expanded", { state: next });
  };
  const openFullRoomFromCompact = () => {
    reportProductEvent("room_expanded", { state: "full" });
    onOpen();
  };

  if (mode === "minimal") {
    return (
      <VoiceMinimalSessionDock
        {...{ chatName, participantCount, activeSpeakerName, durationLabel, mediaStatus, connectionLabel, micMuted, cameraEnabled, screenSharing, mediaActionPending, leavePending, onOpen, onToggleMic, onLeave }}
        onModeChange={changeMode}
      />
    );
  }

  if (mode === "compact") {
    return (
      <VoiceCompactSessionDock
        {...{ chatName, participantCount, activeSpeakerName, durationLabel, mediaStatus, connectionLabel, micMuted, cameraEnabled, screenSharing, mediaActionPending, leavePending, onToggleMic, onLeave }}
        onOpen={openFullRoomFromCompact}
        onModeChange={changeMode}
      />
    );
  }

  return (
    <div
      ref={dockRef}
      className={cn(
        "voople-voice-dock fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-[70] flex touch-none select-none flex-col gap-2 overflow-hidden rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-[0_12px_36px_rgb(0_0_0/0.24)] lg:bottom-4",
        geometry.gestureActive ? "cursor-grabbing" : "cursor-grab",
      )}
      style={geometry.style}
      role="region"
      aria-label="Текущий голосовой разговор"
      onPointerDown={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("[data-voice-dock-control]")) return;
        const dragSurface = target.closest("[data-voice-dock-drag-surface]");
        if (!dragSurface && target.closest("button, a, input, textarea, select, label, [role='button'], [role='menuitem']")) return;
        geometry.startMove(event);
      }}
      onPointerMove={geometry.updateGesture}
      onPointerUp={geometry.endGesture}
      onPointerCancel={geometry.cancelGesture}
      onClickCapture={geometry.captureClick}
      onDoubleClick={(event) => {
        const target = event.target;
        if (target instanceof Element && !target.closest("[data-voice-dock-control]")) {
          geometry.resetPosition();
        }
      }}
    >
      {mediaPreview ? (
        <div
          data-voice-dock-drag-surface=""
          className="min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing [&>*]:h-full"
        >
          {mediaPreview}
        </div>
      ) : null}
      <div data-voice-dock-control="" className="flex w-full shrink-0 items-center gap-2">
        <IconButton
          label="Компактный режим"
          onClick={() => changeMode("compact")}
          className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
        >
          <ChevronDown className="h-4 w-4" />
        </IconButton>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--app-radius-sm)] px-2 py-1.5 text-left transition hover:bg-[var(--app-surface-soft)]"
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-[var(--app-radius-sm)]",
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

        <IconButton
          label={micMuted ? "Включить микрофон" : "Выключить микрофон"}
          disabled={mediaActionPending || mediaStatus !== "connected"}
          onClick={onToggleMic}
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-[var(--app-radius-sm)] border transition disabled:opacity-50",
            micMuted
              ? "border-red-500/25 bg-red-500/10 text-red-500"
              : "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white",
          )}
        >
          {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label={outputMuted ? "Включить звук собеседников" : "Выключить звук собеседников"}
          onClick={onToggleOutput}
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-[var(--app-radius-sm)] border transition",
            outputMuted
              ? "border-red-500/25 bg-red-500/10 text-red-500"
              : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-muted)]",
          )}
        >
          {outputMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label="Участники и настройки"
          onClick={onOpen}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-muted)] transition hover:text-[var(--foreground)]"
        >
          <Settings2 className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Выйти из разговора"
          disabled={leavePending}
          onClick={onLeave}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--app-radius-sm)] bg-red-500 text-white transition hover:bg-red-400 disabled:opacity-50"
        >
          <PhoneOff className="h-4 w-4" />
        </IconButton>
      </div>
      <VoiceDockResizeHandles
        onStart={geometry.startResize}
        onMove={geometry.updateGesture}
        onEnd={geometry.endGesture}
        onCancel={geometry.cancelGesture}
        onKeyDown={geometry.resizeWithKeyboard}
      />
    </div>
  );
}
