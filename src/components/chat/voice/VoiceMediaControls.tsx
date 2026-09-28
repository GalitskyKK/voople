"use client";

import { Camera, CameraOff, Loader2, Mic, MicOff, MonitorUp, Volume2, VolumeX } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { traceVoiceMic } from "@/lib/livekit/voice-mic-debug";
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
  sessionPending?: boolean;
  onMicToggle: () => void | Promise<void>;
  onOutputToggle: () => void;
  onScreenShareToggle: () => void | Promise<void>;
  onCameraToggle: () => void | Promise<void>;
};

const controlClass =
  "grid h-11 w-11 place-items-center rounded-full border transition duration-200 disabled:opacity-45";
const liveControlClass =
  "border-[var(--material-border-hover)] bg-[var(--material-control-fill)] text-[var(--material-ice)] shadow-[inset_0_1px_0_var(--material-highlight)] hover:bg-[var(--material-interactive-fill)]";

export function VoiceMediaControls({
  mediaStatus,
  micMuted,
  outputMuted,
  mediaActionPending,
  screenSharing,
  screenSharePending,
  cameraEnabled,
  cameraPending,
  sessionPending = false,
  onMicToggle,
  onOutputToggle,
  onScreenShareToggle,
  onCameraToggle,
}: VoiceMediaControlsProps) {
  const connected = mediaStatus === "connected";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <IconButton
        label={micMuted ? "Включить микрофон" : "Выключить микрофон"}
        aria-pressed={!micMuted}
        tooltipClassName="shrink-0"
        disabled={sessionPending || !connected || mediaActionPending}
        onClick={() => {
          traceVoiceMic("control.click", { mediaStatus, micMuted, sessionPending, mediaActionPending });
          void onMicToggle();
        }}
        className={cn(
          controlClass,
          micMuted
            ? "border-red-500/25 bg-red-500/10"
            : liveControlClass,
        )}
      >
        {mediaActionPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : micMuted ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </IconButton>

      <IconButton
        label={outputMuted ? "Включить звук собеседников" : "Выключить звук собеседников"}
        aria-pressed={!outputMuted}
        tooltipClassName="shrink-0"
        disabled={sessionPending || !connected}
        onClick={onOutputToggle}
        className={cn(
          controlClass,
          outputMuted
            ? "border-red-500/25 bg-red-500/10"
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
      >
        {outputMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </IconButton>

      <IconButton
        label={cameraEnabled ? "Выключить камеру" : "Включить камеру"}
        aria-pressed={cameraEnabled}
        tooltipClassName="shrink-0"
        disabled={sessionPending || !connected || cameraPending}
        onClick={() => void onCameraToggle()}
        className={cn(
          controlClass,
          cameraEnabled
            ? liveControlClass
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
      </IconButton>

      <IconButton
        label={screenSharing ? "Остановить демонстрацию" : "Показать экран"}
        aria-pressed={screenSharing}
        tooltipClassName="shrink-0"
        disabled={sessionPending || !connected || screenSharePending}
        onClick={() => void onScreenShareToggle()}
        className={cn(
          controlClass,
          screenSharing
            ? liveControlClass
            : "border-[var(--app-border)] bg-[var(--app-surface-soft)]",
        )}
      >
        {screenSharePending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MonitorUp className="h-5 w-5" />
        )}
      </IconButton>
    </div>
  );
}
