"use client";

import type { ReactNode, RefObject } from "react";
import {
  DoorOpen,
  Headphones,
  Loader2,
  Lock,
  LockOpen,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { resolveRingStyle } from "@/lib/customization/rings";
import { cn } from "@/lib/utils";

import { getQualityLabel, type MediaStatus } from "./voice-room-config";
import { VoiceMediaControls } from "./VoiceMediaControls";
import { VoiceMediaStage } from "./VoiceMediaStage";

type VoiceParticipant = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarDecorationUrl: string | null;
  avatarRingId: string | null;
  isMe: boolean;
  micMuted: boolean;
};

type VoiceRoomSheetProps = {
  open: boolean;
  onClose: () => void;
  screenContainerRef: RefObject<HTMLDivElement | null>;
  cameraContainerRef: RefObject<HTMLDivElement | null>;
  isDirect: boolean;
  chatName: string;
  active: boolean;
  connectionLabel: string | null;
  mediaStatus: MediaStatus;
  connectionQuality: ConnectionQuality;
  screenShareOwner: string | null;
  participants: VoiceParticipant[];
  micMuted: boolean;
  outputMuted: boolean;
  remoteMicMutedById: Record<string, boolean>;
  activeSpeakerIds: ReadonlySet<string>;
  mediaActionPending: boolean;
  screenSharePending: boolean;
  screenSharing: boolean;
  cameraCount: number;
  cameraEnabled: boolean;
  cameraPending: boolean;
  audioBlocked: boolean;
  onMicToggle: () => void | Promise<void>;
  onOutputToggle: () => void;
  onScreenShareToggle: () => void | Promise<void>;
  onCameraToggle: () => void | Promise<void>;
  onResumeAudio: () => void | Promise<void>;
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
  cameraContainerRef,
  isDirect,
  chatName,
  active,
  connectionLabel,
  mediaStatus,
  connectionQuality,
  screenShareOwner,
  participants,
  micMuted,
  outputMuted,
  remoteMicMutedById,
  activeSpeakerIds,
  mediaActionPending,
  screenSharePending,
  screenSharing,
  cameraCount,
  cameraEnabled,
  cameraPending,
  audioBlocked,
  onMicToggle,
  onOutputToggle,
  onScreenShareToggle,
  onCameraToggle,
  onResumeAudio,
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
  return (
    <Sheet open={open} onClose={onClose} className={cn("h-[min(90dvh,720px)] overflow-x-hidden", isDirect ? "max-w-xl" : "max-w-4xl")}>
      <div className="pr-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">
          {isDirect ? "Разговор вдвоём" : "Комната"}
        </p>
        <h2 className="mt-1 truncate text-xl font-semibold">{chatName}</h2>

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

      <VoiceMediaStage
        screenContainerRef={screenContainerRef}
        cameraContainerRef={cameraContainerRef}
        screenShareOwner={screenShareOwner}
        cameraCount={cameraCount}
      />

      {active ? (
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2">
          {participants.map((participant) => {
            const actualMuted = participant.isMe
              ? micMuted
              : (remoteMicMutedById[participant.id] ?? participant.micMuted);
            const speaking = activeSpeakerIds.has(participant.id);
            return (
              <div
                key={participant.id}
                className={cn(
                  "relative flex min-h-36 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border bg-[var(--app-surface-soft)] px-4 py-5 text-center transition",
                  speaking ? "border-emerald-500/50" : "border-[var(--app-border)]",
                )}
              >
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
                <div className="min-w-0 max-w-full">
                  <p className="truncate text-sm font-medium">
                    {participant.displayName}
                    {participant.isMe ? " · вы" : ""}
                  </p>
                  <p className="truncate text-xs text-[var(--app-muted)]">
                    {speaking ? "говорит" : `@${participant.username}`}
                  </p>
                </div>
                {actualMuted ? (
                  <MicOff className="absolute right-3 top-3 h-4 w-4 text-[var(--app-muted)]" />
                ) : (
                  <Mic className="absolute right-3 top-3 h-4 w-4 text-emerald-400" />
                )}
              </div>
            );
          })}
        </div>
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

      {settingsPanel}

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
