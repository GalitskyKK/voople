"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DoorOpen,
  Headphones,
  Loader2,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  PhoneOff,
  Settings2,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView } from "@/types/chat";

import { getQualityLabel, type MediaStatus } from "./voice-room-config";
import { useVoiceRoomFullscreen } from "./useVoiceRoomFullscreen";
import { VoiceMediaControls } from "./VoiceMediaControls";
import { VoiceRoomStage } from "./VoiceRoomStage";

type VoiceRoomSheetProps = {
  open: boolean;
  onClose: () => void;
  screenContainerRef: (element: HTMLDivElement | null) => void;
  isDirect: boolean;
  chatName: string;
  active: boolean;
  durationLabel: string | null;
  connectionLabel: string | null;
  mediaStatus: MediaStatus;
  connectionQuality: ConnectionQuality;
  screenShareOwner: string | null;
  participants: ChatRoomParticipantView[];
  participantVolumes: Record<string, number>;
  micMuted: boolean;
  outputMuted: boolean;
  remoteMicMutedById: Record<string, boolean>;
  activeSpeakerIds: ReadonlySet<string>;
  mediaActionPending: boolean;
  screenSharePending: boolean;
  screenSharing: boolean;
  cameraParticipantIds: ReadonlySet<string>;
  cameraEnabled: boolean;
  cameraPending: boolean;
  audioBlocked: boolean;
  onMicToggle: () => void | Promise<void>;
  onOutputToggle: () => void;
  onScreenShareToggle: () => void | Promise<void>;
  onCameraToggle: () => void | Promise<void>;
  onResumeAudio: () => void | Promise<void>;
  onCameraContainerChange: (participantId: string, element: HTMLDivElement | null) => void;
  onParticipantVolumeChange: (participantId: string, volume: number) => void;
  settingsPanel: ReactNode;
  canManageAccess: boolean;
  accessMode: "open" | "locked";
  accessPending: boolean;
  onAccessToggle: () => void;
  inside: boolean;
  errorMessage: string | null;
  leavePending: boolean;
  onLeave: () => void | Promise<void>;
  connectPending: boolean;
  connectDisabled: boolean;
  onConnect: () => void | Promise<void>;
  connectLabel: string;
};

export function VoiceRoomSheet(props: VoiceRoomSheetProps) {
  const {
    open, onClose, screenContainerRef, isDirect, chatName, active, durationLabel,
    connectionLabel, mediaStatus, connectionQuality, screenShareOwner, participants,
    participantVolumes, micMuted, outputMuted, remoteMicMutedById, activeSpeakerIds,
    mediaActionPending, screenSharePending, screenSharing, cameraParticipantIds,
    cameraEnabled, cameraPending, audioBlocked, onMicToggle, onOutputToggle,
    onScreenShareToggle, onCameraToggle, onResumeAudio, onCameraContainerChange,
    onParticipantVolumeChange, settingsPanel, canManageAccess, accessMode,
    accessPending, onAccessToggle, inside, errorMessage, leavePending, onLeave,
    connectPending, connectDisabled, onConnect, connectLabel,
  } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { fullscreen, toggleFullscreen, exitFullscreen } = useVoiceRoomFullscreen();
  const connected = mediaStatus === "connected" || mediaStatus === "reconnecting";
  const weakConnection =
    connectionQuality === ConnectionQuality.Poor ||
    connectionQuality === ConnectionQuality.Lost;

  const close = () => {
    setSettingsOpen(false);
    void exitFullscreen();
    onClose();
  };

  useEffect(() => {
    if (!open) void exitFullscreen();
  }, [exitFullscreen, open]);

  return (
    <Sheet
      open={open}
      onClose={close}
      ariaLabel={`Комната ${chatName}`}
      containerClassName={fullscreen ? "p-0 sm:p-0" : undefined}
      closeOnEscape={!fullscreen}
      className={cn(
        "overflow-hidden",
        active
          ? "h-[min(94dvh,860px)] max-h-[94dvh] max-w-6xl p-0"
          : isDirect
            ? "max-w-xl"
            : "max-w-2xl",
        fullscreen && "h-dvh max-h-none max-w-none rounded-none border-0 p-0 sm:rounded-none",
      )}
    >
      <div className={cn("flex min-h-0 flex-col", active && "h-full")}>
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-3 pr-14">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold sm:text-lg">{chatName}</h2>
              {durationLabel ? (
                <span className="shrink-0 text-xs tabular-nums text-[var(--app-muted)]">{durationLabel}</span>
              ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--app-muted)]">
              <span>{isDirect ? "Разговор вдвоём" : `${participants.length} в комнате`}</span>
              {connectionLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  {mediaStatus === "connecting" || mediaStatus === "reconnecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  {connectionLabel}
                </span>
              ) : null}
              {mediaStatus === "connected" ? (
                <span className="inline-flex items-center gap-1.5">
                  {weakConnection ? <WifiOff className="h-3.5 w-3.5 text-amber-400" /> : <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
                  {getQualityLabel(connectionQuality)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canManageAccess ? (
              <button type="button" disabled={accessPending} onClick={onAccessToggle} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] disabled:opacity-45" aria-label={accessMode === "locked" ? "Открыть свободный вход" : "Закрыть свободный вход"} title={accessMode === "locked" ? "Открыть комнату" : "Закрыть комнату"}>
                {accessMode === "locked" ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              </button>
            ) : null}
            <button type="button" onClick={() => setSettingsOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]" aria-label="Настройки звука и соединения" title="Настройки">
              <Settings2 className="h-4 w-4" />
            </button>
            {active ? (
              <button type="button" onClick={() => void toggleFullscreen()} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]" aria-label={fullscreen ? "Выйти из полноэкранного режима" : "Открыть разговор на весь экран"} title={fullscreen ? "Свернуть" : "На весь экран"}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        </header>

        {active ? (
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <VoiceRoomStage
              screenContainerRef={screenContainerRef}
              screenShareOwner={screenShareOwner}
              participants={participants}
              participantVolumes={participantVolumes}
              micMuted={micMuted}
              remoteMicMutedById={remoteMicMutedById}
              activeSpeakerIds={activeSpeakerIds}
              cameraParticipantIds={cameraParticipantIds}
              onCameraContainerChange={onCameraContainerChange}
              onParticipantVolumeChange={onParticipantVolumeChange}
            />
          </div>
        ) : (
          <div className="m-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)"><DoorOpen className="h-5 w-5" /></span>
              <div><p className="text-sm font-medium">{isDirect ? "Начать разговор" : "Открыть комнату"}</p><p className="text-xs text-[var(--app-muted)]">Микрофон включается отдельно.</p></div>
            </div>
          </div>
        )}

        <footer className="shrink-0 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] p-3 backdrop-blur-xl">
          {audioBlocked ? (
            <button type="button" onClick={() => void onResumeAudio()} className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300"><Volume2 className="h-4 w-4" />Включить звук собеседников</button>
          ) : null}
          {accessMode === "locked" && !inside ? <p className="mb-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">Комната закрыта для свободного входа.</p> : null}
          {errorMessage ? <p className="mb-2 text-center text-sm text-red-400" role="alert">{errorMessage}</p> : null}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <VoiceMediaControls
              compact={active}
              mediaStatus={mediaStatus}
              micMuted={micMuted}
              outputMuted={outputMuted}
              mediaActionPending={mediaActionPending}
              screenSharing={screenSharing}
              screenSharePending={screenSharePending}
              cameraEnabled={cameraEnabled}
              cameraPending={cameraPending}
              onMicToggle={onMicToggle}
              onOutputToggle={onOutputToggle}
              onScreenShareToggle={onScreenShareToggle}
              onCameraToggle={onCameraToggle}
            />
            {inside && connected ? (
              <button type="button" disabled={leavePending} onClick={() => void onLeave()} className="grid h-11 w-11 place-items-center rounded-xl bg-red-500 text-white transition hover:bg-red-400 disabled:opacity-45" aria-label="Выйти из комнаты" title="Выйти"><PhoneOff className="h-5 w-5" /></button>
            ) : (
              <Button type="button" disabled={connectDisabled} onClick={() => void onConnect()}>
                {connectPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4" />}{connectLabel}
              </Button>
            )}
          </div>
          {inside && !connected ? (
            <button type="button" disabled={leavePending} onClick={() => void onLeave()} className="mt-2 w-full rounded-xl py-1 text-xs text-[var(--app-muted)] transition hover:text-[var(--foreground)]">Закрыть участие</button>
          ) : null}
        </footer>
      </div>

      <Sheet open={open && settingsOpen} onClose={() => setSettingsOpen(false)} className="max-w-xl" ariaLabel="Настройки звука и соединения">
        <div className="mb-5 pr-10"><h3 className="text-xl font-semibold">Звук и соединение</h3><p className="mt-1 text-sm text-[var(--app-muted)]">Устройства, обработка голоса и маршрут медиасервера.</p></div>
        {settingsPanel}
      </Sheet>
    </Sheet>
  );
}
