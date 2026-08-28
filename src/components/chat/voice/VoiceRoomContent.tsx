"use client";

import { Loader2 } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { ScreenShareStatusBanner } from "./ScreenShareStatusBanner";
import type { VoiceRoomSurfacePhase } from "./voice-room-surface";
import type {
  VoiceRoomControlsModel,
  VoiceRoomIdentityModel,
  VoiceRoomStageModel,
} from "./voice-room-sheet-models";
import { VoiceRoomEmptyState } from "./VoiceRoomEmptyState";
import { VoiceRoomStage } from "./VoiceRoomStage";

export function VoiceRoomContent({
  identity,
  stage,
  controls,
  sessionPhase,
  onInvite,
}: {
  identity: VoiceRoomIdentityModel;
  stage: VoiceRoomStageModel;
  controls: VoiceRoomControlsModel;
  sessionPhase: VoiceRoomSurfacePhase;
  onInvite: () => void;
}) {
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
  if (directCallState) {
    return <DirectCallState identity={identity} />;
  }
  if (sessionPhase === "connecting") {
    return <VoiceRoomTransitionState title="Подключаем комнату" description="Проверяем доступ и настраиваем звук…" />;
  }
  if (sessionPhase === "error") {
    return <VoiceRoomTransitionState title="Не удалось подключиться" description="Проверьте сообщение ниже и повторите подключение." pending={false} />;
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
    <div className="voople-room-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
      {sessionPhase === "preview" && identity.active ? (
        <div className="mb-3 shrink-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm text-[var(--app-muted)]">
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
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)] p-3">
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

function VoiceRoomTransitionState({
  title,
  description,
  pending = true,
}: {
  title: string;
  description: string;
  pending?: boolean;
}) {
  return (
    <div className="voople-room-surface flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4" aria-live="polite">
      <div className="flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-6 py-10 text-center">
        {pending ? <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-accent)]" /> : null}
        <h3 className={cn("text-xl font-semibold", pending && "mt-5")}>{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">{description}</p>
      </div>
    </div>
  );
}

function DirectCallState({ identity }: { identity: VoiceRoomIdentityModel }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="relative">
        <div
          className={cn(
            "absolute -inset-5 rounded-full bg-[var(--theme-accent)]/20 blur-xl",
            identity.callPhase !== "ended" && "animate-pulse",
          )}
        />
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
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
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
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2">
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
