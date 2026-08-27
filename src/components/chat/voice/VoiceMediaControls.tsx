"use client";

import { Camera, CameraOff, Loader2, Mic, MicOff, MonitorUp, Volume2, VolumeX } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import type { MediaStatus } from "./voice-room-config";

type VoiceMediaControlsProps = {
  mediaStatus: MediaStatus;
  micMuted: boolean;
  outputMuted: boolean;
  mediaActionPending: boolean;
  screenSharing: boolean;
  screenSharePending: boolean;
  cameraEnabled: boolean;
  cameraPending: boolean;
  onMicToggle: () => void | Promise<void>;
  onOutputToggle: () => void;
  onScreenShareToggle: () => void | Promise<void>;
  onCameraToggle: () => void | Promise<void>;
  compact?: boolean;
};

const controlClass =
  "flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition disabled:opacity-45";

export function VoiceMediaControls({
  mediaStatus,
  micMuted,
  outputMuted,
  mediaActionPending,
  screenSharing,
  screenSharePending,
  cameraEnabled,
  cameraPending,
  onMicToggle,
  onOutputToggle,
  onScreenShareToggle,
  onCameraToggle,
  compact = false,
}: VoiceMediaControlsProps) {
  const connected = mediaStatus === "connected";
  const itemClass = compact
    ? "grid h-11 w-11 place-items-center rounded-full border transition duration-200 disabled:opacity-45"
    : controlClass;

  return (
    <div className={compact ? "flex flex-wrap items-center justify-center gap-2" : "mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"}>
      <IconButton
        label={micMuted ? "Включить микрофон" : "Выключить микрофон"}
        tooltipClassName={compact ? "shrink-0" : "h-full w-full"}
        disabled={mediaActionPending}
        onClick={() => void onMicToggle()}
        className={cn(
          itemClass,
          micMuted
            ? "border-red-500/25 bg-red-500/10"
            : "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--theme-accent)_14%,transparent)] hover:brightness-110",
        )}
      >
        {mediaActionPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : micMuted ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
        <span className={compact ? "sr-only" : undefined}>Микрофон</span>
      </IconButton>

      <IconButton
        label={outputMuted ? "Включить звук собеседников" : "Выключить звук собеседников"}
        tooltipClassName={compact ? "shrink-0" : "h-full w-full"}
        disabled={!connected}
        onClick={onOutputToggle}
        className={cn(
          itemClass,
          outputMuted
            ? "border-red-500/25 bg-red-500/10"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
      >
        {outputMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        <span className={compact ? "sr-only" : undefined}>{outputMuted ? "Без звука" : "Звук"}</span>
      </IconButton>

      <IconButton
        label={cameraEnabled ? "Выключить камеру" : "Включить камеру"}
        tooltipClassName={compact ? "shrink-0" : "h-full w-full"}
        disabled={!connected || cameraPending}
        onClick={() => void onCameraToggle()}
        className={cn(
          itemClass,
          cameraEnabled
            ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
      >
        {cameraPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : cameraEnabled ? (
          <CameraOff className="h-5 w-5" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
        <span className={compact ? "sr-only" : undefined}>{cameraEnabled ? "Выключить" : "Камера"}</span>
      </IconButton>

      <IconButton
        label={screenSharing ? "Остановить демонстрацию" : "Показать экран"}
        tooltipClassName={compact ? "shrink-0" : "h-full w-full"}
        disabled={!connected || screenSharePending}
        onClick={() => void onScreenShareToggle()}
        className={cn(
          itemClass,
          screenSharing
            ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-white"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
      >
        {screenSharePending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MonitorUp className="h-5 w-5" />
        )}
        <span className={compact ? "sr-only" : undefined}>{screenSharing ? "Остановить" : "Экран"}</span>
      </IconButton>
    </div>
  );
}
