"use client";

import { Camera, CameraOff, Loader2, Mic, MicOff, MonitorUp, Volume2, VolumeX } from "lucide-react";

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
};

const controlClass =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition disabled:opacity-45";

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
}: VoiceMediaControlsProps) {
  const connected = mediaStatus === "connected";

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        type="button"
        disabled={mediaActionPending}
        onClick={() => void onMicToggle()}
        className={cn(
          controlClass,
          micMuted
            ? "border-red-500/25 bg-red-500/10"
            : "border-emerald-500/35 bg-emerald-500/10",
        )}
        aria-label={micMuted ? "Включить микрофон" : "Выключить микрофон"}
      >
        {mediaActionPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : micMuted ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5 text-emerald-400" />
        )}
        {micMuted ? "Микрофон" : "В эфире"}
      </button>

      <button
        type="button"
        disabled={!connected}
        onClick={onOutputToggle}
        className={cn(
          controlClass,
          outputMuted
            ? "border-red-500/25 bg-red-500/10"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
        aria-label={outputMuted ? "Включить звук собеседников" : "Выключить звук собеседников"}
      >
        {outputMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        {outputMuted ? "Без звука" : "Звук"}
      </button>

      <button
        type="button"
        disabled={!connected || cameraPending}
        onClick={() => void onCameraToggle()}
        className={cn(
          controlClass,
          cameraEnabled
            ? "border-[color-mix(in_srgb,var(--theme-accent)_45%,var(--app-border))] bg-[var(--app-accent-soft)]"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
        aria-label={cameraEnabled ? "Выключить камеру" : "Включить камеру"}
      >
        {cameraPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : cameraEnabled ? (
          <CameraOff className="h-5 w-5" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
        {cameraEnabled ? "Выключить" : "Камера"}
      </button>

      <button
        type="button"
        disabled={!connected || screenSharePending}
        onClick={() => void onScreenShareToggle()}
        className={cn(
          controlClass,
          screenSharing
            ? "border-[color-mix(in_srgb,var(--theme-accent)_45%,var(--app-border))] bg-[var(--app-accent-soft)]"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
        aria-label={screenSharing ? "Остановить демонстрацию" : "Показать экран"}
      >
        {screenSharePending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MonitorUp className="h-5 w-5" />
        )}
        {screenSharing ? "Остановить" : "Экран"}
      </button>
    </div>
  );
}
