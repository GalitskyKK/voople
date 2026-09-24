"use client";

import { Loader2 } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { ScreenShareStatusBanner } from "./ScreenShareStatusBanner";
import type {
  VoiceRoomControlsModel,
  VoiceRoomIdentityModel,
  VoiceRoomSessionModel,
  VoiceRoomStageModel,
} from "./voice-room-sheet-models";
import { VoiceRoomEmptyState } from "./VoiceRoomEmptyState";
import {
  VoiceRoomErrorState,
  VoiceRoomTransitionState,
} from "./VoiceRoomSessionStates";
import { resolveVoiceRoomErrorTitle } from "./voice-room-surface";
import { VoiceRoomStage } from "./VoiceRoomStage";

export function VoiceRoomContent({
  identity,
  stage,
  controls,
  session,
  errorMessage,
  onInvite,
}: {
  identity: VoiceRoomIdentityModel;
  stage: VoiceRoomStageModel;
  controls: VoiceRoomControlsModel;
  session: VoiceRoomSessionModel;
  errorMessage: string | null;
  onInvite?: () => void;
}) {
  const sessionPhase = session.phase;
  const directCallState =
    identity.isDirect &&
    identity.callPhase &&
    identity.callPhase !== "connected" &&
    identity.callPhase !== "idle";

  if (sessionPhase === "leaving") {
    return <VoiceRoomTransitionState title="Выходим из комнаты" description="Завершаем медиасессию и обновляем участников…" />;
  }
  if (sessionPhase === "loading") {
    return <VoiceRoomTransitionState title="Открываем комнату" description="Загружаем актуальное состояние и участников…" />;
  }
  if (sessionPhase === "connecting") {
    return <VoiceRoomTransitionState title="Подключаем комнату" description="Проверяем доступ и настраиваем звук…" />;
  }
  if (sessionPhase === "error") {
    return (
      <VoiceRoomErrorState
        title={resolveVoiceRoomErrorTitle(session.retryLabel)}
        message={errorMessage}
        retryLabel={session.retryLabel}
        retryPending={session.retryPending}
        onRetry={session.onRetry}
      />
    );
  }
  if (directCallState) {
    return <DirectCallState identity={identity} />;
  }
  if (sessionPhase === "preview" && !identity.active) {
    return identity.isDirect ? (
      <DirectCallPreview chatName={identity.chatName} />
    ) : (
      <div className="voople-room-surface min-h-0 flex-1 p-3 sm:p-4">
        <VoiceRoomEmptyState state="preview" />
      </div>
    );
  }

  return (
    <div className="voople-room-surface voople-room-surface__state voople-full-room__content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
      {sessionPhase === "reconnecting" ? (
        <div className="mb-3 flex shrink-0 items-center gap-3 rounded-[var(--app-radius-sm)] border border-amber-400/35 bg-amber-400/8 px-3 py-2" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400 motion-reduce:animate-none" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Восстанавливаем связь</p>
            <p className="truncate text-xs text-[var(--app-muted)]">Участники и демонстрация останутся на месте.</p>
          </div>
        </div>
      ) : null}
      {sessionPhase === "preview" && identity.active ? (
        <div className="mb-3 shrink-0 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm text-[var(--app-muted)]">
          Комната уже идёт — участники видны до подключения. Нажмите «Войти в комнату», чтобы присоединиться.
        </div>
      ) : null}
      {controls.screenSharing ? (
        <ScreenShareStatusBanner
          hasAudio={controls.screenShareHasAudio}
          previewVisible={stage.watchingScreenShare}
          onPreviewToggle={stage.watchingScreenShare
            ? stage.onStopWatchingScreenShare
            : stage.onWatchScreenShare}
        />
      ) : null}
      {stage.screenShareAvailable && !stage.watchingScreenShare && !controls.screenSharing ? (
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[var(--app-radius-sm)] border border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)] p-3">
          <div>
            <p className="text-sm font-semibold">Идёт демонстрация</p>
            <p className="text-xs text-[var(--app-muted)]">
              {stage.screenShareAvailable} показывает экран. Трафик начнёт расходоваться после подключения.
            </p>
          </div>
          <Button type="button" onClick={stage.onWatchScreenShare}>Смотреть</Button>
        </div>
      ) : null}
      {stage.watchingScreenShare && !controls.screenSharing ? (
        <ScreenShareVolume stage={stage} />
      ) : null}
      {sessionPhase !== "preview" &&
      !identity.isDirect &&
      stage.participants.length <= 1 &&
      !stage.screenShareOwner &&
      stage.cameraParticipantIds.size === 0 ? (
        <VoiceRoomEmptyState participant={stage.participants[0]} state="inside" onInvite={onInvite} />
      ) : (
        <VoiceRoomStage
          screenContainerRef={stage.screenContainerRef}
          screenShareOwner={stage.screenShareOwner}
          screenShareTrackId={stage.screenShareTrackId}
          screenShareIsLocal={stage.screenShareIsLocal}
          participants={stage.participants}
          participantVolumes={stage.participantVolumes}
          micMuted={controls.micMuted}
          remoteMicMutedById={stage.remoteMicMutedById}
          activeSpeakerIds={stage.activeSpeakerIds}
          cameraParticipantIds={stage.cameraParticipantIds}
          onCameraContainerChange={stage.onCameraContainerChange}
          onParticipantVolumeChange={stage.onParticipantVolumeChange}
        />
      )}
    </div>
  );
}

function DirectCallState({ identity }: { identity: VoiceRoomIdentityModel }) {
  return (
    <div className="voople-full-room__content flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="rounded-[var(--app-radius-sm)] border border-[var(--app-border)] p-2">
        <ProfileAvatarVisual
          displayName={identity.chatName}
          size="lg"
          className={cn(identity.callPhase === "dialing" && "opacity-75 blur-[1px]")}
        />
      </div>
      <h3 className="mt-5 text-xl font-semibold">{identity.chatName}</h3>
      <p className="mt-2 text-sm text-[var(--app-muted)]">
        {identity.callPhase === "dialing"
          ? "Ждём ответа…"
          : identity.callPhase === "ringing"
            ? "Входящий звонок"
            : "Звонок завершён"}
      </p>
    </div>
  );
}

function DirectCallPreview({ chatName }: { chatName: string }) {
  return (
    <div className="voople-full-room__content flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
      <ProfileAvatarVisual displayName={chatName} size="lg" />
      <h3 className="mt-5 text-xl font-semibold">Начать разговор</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">
        Собеседник увидит входящий звонок. Микрофон можно выключить до подключения.
      </p>
    </div>
  );
}

function ScreenShareVolume({ stage }: { stage: VoiceRoomStageModel }) {
  const percent = Math.round(stage.screenShareVolume * 100);
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2">
      <label className="flex min-w-48 flex-1 items-center gap-3 text-xs font-medium">
        Звук демонстрации
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={percent}
          onChange={(event) => stage.onScreenShareVolumeChange(Number(event.target.value) / 100)}
          className="min-w-24 flex-1 accent-[var(--theme-accent)]"
          aria-label="Громкость демонстрации"
        />
        <span className="w-10 text-right tabular-nums">{percent}%</span>
      </label>
      <button
        type="button"
        onClick={stage.onStopWatchingScreenShare}
        className="rounded-lg px-3 py-1.5 text-xs text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--foreground)]"
      >
        Не смотреть
      </button>
    </div>
  );
}
