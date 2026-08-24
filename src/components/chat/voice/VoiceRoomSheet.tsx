"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Headphones,
  Loader2,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Music2,
  PhoneOff,
  Settings2,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView, GroupSoundView } from "@/types/chat";

import { getQualityLabel, type MediaStatus } from "./voice-room-config";
import { useVoiceRoomFullscreen } from "./useVoiceRoomFullscreen";
import { VoiceMediaControls } from "./VoiceMediaControls";
import { VoiceRoomStage } from "./VoiceRoomStage";
import { VoiceRoomEmptyState } from "./VoiceRoomEmptyState";
import { ScreenShareStatusBanner } from "./ScreenShareStatusBanner";
import { VoiceSoundboardPanel } from "./VoiceSoundboardPanel";

type VoiceRoomSheetProps = {
  open: boolean;
  onClose: () => void;
  screenContainerRef: (element: HTMLDivElement | null) => void;
  isDirect: boolean;
  callPhase: "idle" | "dialing" | "ringing" | "connected" | "ended" | null;
  chatName: string;
  active: boolean;
  durationLabel: string | null;
  connectionLabel: string | null;
  mediaStatus: MediaStatus;
  connectionQuality: ConnectionQuality;
  screenShareOwner: string | null;
  screenShareAvailable: string | null;
  watchingScreenShare: boolean;
  screenShareVolume: number;
  participants: ChatRoomParticipantView[];
  groupSounds: GroupSoundView[];
  participantVolumes: Record<string, number>;
  micMuted: boolean;
  outputMuted: boolean;
  remoteMicMutedById: Record<string, boolean>;
  activeSpeakerIds: ReadonlySet<string>;
  mediaActionPending: boolean;
  screenSharePending: boolean;
  screenSharing: boolean;
  screenShareHasAudio: boolean;
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
  onScreenShareVolumeChange: (volume: number) => void;
  onGroupSoundPlay: (sound: GroupSoundView) => void;
  onWatchScreenShare: () => void;
  onStopWatchingScreenShare: () => void;
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
    open, onClose, screenContainerRef, isDirect, callPhase, chatName, active, durationLabel,
    connectionLabel, mediaStatus, connectionQuality, screenShareOwner, screenShareAvailable,
    watchingScreenShare, screenShareVolume, participants, groupSounds,
    participantVolumes, micMuted, outputMuted, remoteMicMutedById, activeSpeakerIds,
    mediaActionPending, screenSharePending, screenSharing, screenShareHasAudio, cameraParticipantIds,
    cameraEnabled, cameraPending, audioBlocked, onMicToggle, onOutputToggle,
    onScreenShareToggle, onCameraToggle, onResumeAudio, onCameraContainerChange,
    onParticipantVolumeChange, onScreenShareVolumeChange, onGroupSoundPlay, onWatchScreenShare,
    onStopWatchingScreenShare, settingsPanel, canManageAccess, accessMode,
    accessPending, onAccessToggle, inside, errorMessage, leavePending, onLeave,
    connectPending, connectDisabled, onConnect, connectLabel,
  } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundboardOpen, setSoundboardOpen] = useState(false);
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
            {!isDirect && active && groupSounds.length ? (
              <button type="button" onClick={() => setSoundboardOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]" aria-label="Открыть звуки группы" title="Звуки группы"><Music2 className="h-4 w-4" /></button>
            ) : null}
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

        {isDirect && callPhase && callPhase !== "connected" && callPhase !== "idle" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="relative">
              <div className={cn("absolute -inset-5 rounded-full bg-[var(--theme-accent)]/20 blur-xl", callPhase !== "ended" && "animate-pulse")} />
              <ProfileAvatarVisual displayName={chatName} size="lg" className={cn(callPhase === "dialing" && "opacity-75 blur-[1px]")} />
            </div>
            <h3 className="mt-5 text-xl font-semibold">{chatName}</h3>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              {callPhase === "dialing" ? "Ждём ответа…" : callPhase === "ringing" ? "Входящий звонок" : "Звонок завершён"}
            </p>
          </div>
        ) : active ? (
          <div className="voople-room-surface min-h-0 flex-1 p-3 sm:p-4">
            {screenSharing ? <ScreenShareStatusBanner hasAudio={screenShareHasAudio} /> : null}
            {screenShareAvailable && !watchingScreenShare && !screenSharing ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)] p-3">
                <div>
                  <p className="text-sm font-semibold">Идёт демонстрация</p>
                  <p className="text-xs text-[var(--app-muted)]">{screenShareAvailable} показывает экран. Трафик начнёт расходоваться после подключения.</p>
                </div>
                <Button type="button" onClick={onWatchScreenShare}>Смотреть</Button>
              </div>
            ) : null}
            {watchingScreenShare && !screenSharing ? (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2">
                <label className="flex min-w-48 flex-1 items-center gap-3 text-xs font-medium">
                  Звук демонстрации
                  <input type="range" min={0} max={200} step={5} value={Math.round(screenShareVolume * 100)} onChange={(event) => onScreenShareVolumeChange(Number(event.target.value) / 100)} className="min-w-24 flex-1 accent-[var(--theme-accent)]" aria-label="Громкость демонстрации" />
                  <span className="w-10 text-right tabular-nums">{Math.round(screenShareVolume * 100)}%</span>
                </label>
                <button type="button" onClick={onStopWatchingScreenShare} className="rounded-lg px-3 py-1.5 text-xs text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--foreground)]">Не смотреть</button>
              </div>
            ) : null}
            {!isDirect && participants.length <= 1 && !screenShareOwner && cameraParticipantIds.size === 0 ? (
              <VoiceRoomEmptyState participant={participants[0]} state="inside" onInvite={close} />
            ) : <VoiceRoomStage
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
            />}
          </div>
          ) : (
            isDirect ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                <ProfileAvatarVisual displayName={chatName} size="lg" />
                <h3 className="mt-5 text-xl font-semibold">Начать разговор</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">Собеседник увидит входящий звонок. Микрофон можно выключить до подключения.</p>
              </div>
            ) : (
              <div className="voople-room-surface min-h-0 flex-1 p-3 sm:p-4">
                <VoiceRoomEmptyState state="preview" />
              </div>
            )
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
      <Sheet open={open && soundboardOpen} onClose={() => setSoundboardOpen(false)} className="max-w-lg" ariaLabel="Звуки группы">
        <div className="mb-5 pr-10"><h3 className="text-xl font-semibold">Звуки группы</h3><p className="mt-1 text-sm text-[var(--app-muted)]">Звук услышат все участники комнаты.</p></div>
        <VoiceSoundboardPanel sounds={groupSounds} onPlay={(sound) => {
          onGroupSoundPlay(sound);
          setSoundboardOpen(false);
        }} />
      </Sheet>
    </Sheet>
  );
}
