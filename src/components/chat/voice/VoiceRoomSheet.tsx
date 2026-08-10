"use client";

import { useState, type ReactNode } from "react";
import {
  DoorOpen,
  Headphones,
  Loader2,
  Lock,
  LockOpen,
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
  onCameraContainerChange: (
    participantId: string,
    element: HTMLDivElement | null,
  ) => void;
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

export function VoiceRoomSheet({
  open,
  onClose,
  screenContainerRef,
  isDirect,
  chatName,
  active,
  durationLabel,
  connectionLabel,
  mediaStatus,
  connectionQuality,
  screenShareOwner,
  participants,
  participantVolumes,
  micMuted,
  outputMuted,
  remoteMicMutedById,
  activeSpeakerIds,
  mediaActionPending,
  screenSharePending,
  screenSharing,
  cameraParticipantIds,
  cameraEnabled,
  cameraPending,
  audioBlocked,
  onMicToggle,
  onOutputToggle,
  onScreenShareToggle,
  onCameraToggle,
  onResumeAudio,
  onCameraContainerChange,
  onParticipantVolumeChange,
  settingsPanel,
  canManageAccess,
  accessMode,
  accessPending,
  onAccessToggle,
  inside,
  errorMessage,
  leavePending,
  onLeave,
  connectPending,
  connectDisabled,
  onConnect,
  connectLabel,
}: VoiceRoomSheetProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasVisualMedia = Boolean(screenShareOwner) || cameraParticipantIds.size > 0;

  return (
    <Sheet
      open={open}
      onClose={() => {
        setSettingsOpen(false);
        onClose();
      }}
      className={cn(
        "overflow-x-hidden",
        hasVisualMedia
          ? "max-h-[94dvh] max-w-6xl"
          : isDirect
            ? "max-w-xl"
            : "max-w-4xl",
      )}
    >
      <div className="pr-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">
          {isDirect ? "Разговор вдвоём" : "Комната"}
        </p>
        <h2 className="mt-1 truncate text-xl font-semibold">{chatName}</h2>

        {durationLabel ? (
          <p className="mt-1 text-sm tabular-nums text-[var(--app-muted)]">
            {durationLabel}
          </p>
        ) : null}

        {connectionLabel ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
            <span className="inline-flex items-center gap-1.5">
              {mediaStatus === "connecting" || mediaStatus === "reconnecting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {connectionLabel}
            </span>
            {mediaStatus === "connected" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-surface-soft)] px-2 py-1">
                {connectionQuality === ConnectionQuality.Poor ||
                connectionQuality === ConnectionQuality.Lost ? (
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                )}
                {getQualityLabel(connectionQuality)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {active ? (
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
      ) : (
        <div className="mt-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)">
              <DoorOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">
                {isDirect ? "Начать разговор" : "Открыть комнату"}
              </p>
              <p className="text-xs text-[var(--app-muted)]">
                Микрофон включается отдельно.
              </p>
            </div>
          </div>
        </div>
      )}

      <VoiceMediaControls
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

      {audioBlocked ? (
        <button
          type="button"
          onClick={() => void onResumeAudio()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
        >
          <Volume2 className="h-4 w-4" />
          Включить звук собеседников
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm font-medium transition hover:bg-[var(--app-surface)]"
      >
        <span className="inline-flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Звук и соединение
        </span>
        <span className="text-xs font-normal text-[var(--app-muted)]">Настроить</span>
      </button>

      <Sheet
        open={open && settingsOpen}
        onClose={() => setSettingsOpen(false)}
        className="max-w-xl"
        ariaLabel="Настройки звука и соединения"
      >
        <div className="mb-5 pr-10">
          <h3 className="text-xl font-semibold">Звук и соединение</h3>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Устройства, обработка голоса и маршрут медиасервера.
          </p>
        </div>
        {settingsPanel}
      </Sheet>

      {canManageAccess ? (
        <button
          type="button"
          disabled={accessPending}
          onClick={onAccessToggle}
          className="mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
        >
          {accessMode === "locked" ? "Открыть свободный вход" : "Закрыть свободный вход"}
          {accessMode === "locked" ? (
            <LockOpen className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </button>
      ) : null}

      {accessMode === "locked" && !inside ? (
        <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Комната закрыта. Механика запроса на вход будет следующим состоянием доступа.
        </p>
      ) : null}

      {errorMessage ? <p className="mt-3 text-sm text-red-400">{errorMessage}</p> : null}

      {inside && (mediaStatus === "connected" || mediaStatus === "reconnecting") ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-5 w-full"
          disabled={leavePending}
          onClick={() => void onLeave()}
        >
          {leavePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PhoneOff className="h-4 w-4" />
          )}
          Выйти из комнаты
        </Button>
      ) : (
        <Button
          type="button"
          className="mt-5 w-full"
          disabled={connectDisabled}
          onClick={() => void onConnect()}
        >
          {connectPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
          {connectLabel}
        </Button>
      )}

      {inside && mediaStatus !== "connected" && mediaStatus !== "reconnecting" ? (
        <button
          type="button"
          disabled={leavePending}
          onClick={() => void onLeave()}
          className="mt-2 w-full rounded-xl py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--foreground)]"
        >
          Закрыть участие
        </button>
      ) : null}
    </Sheet>
  );
}
