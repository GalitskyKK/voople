"use client";

import { Headphones, Loader2, PhoneOff, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

import type {
  VoiceRoomAccessModel,
  VoiceRoomConnectionModel,
  VoiceRoomControlsModel,
  VoiceRoomIdentityModel,
  VoiceRoomSessionModel,
} from "./voice-room-sheet-models";
import { VoiceMediaControls } from "./VoiceMediaControls";

export function VoiceRoomFooter({
  identity,
  connection,
  controls,
  access,
  session,
}: {
  identity: VoiceRoomIdentityModel;
  connection: VoiceRoomConnectionModel;
  controls: VoiceRoomControlsModel;
  access: VoiceRoomAccessModel;
  session: VoiceRoomSessionModel;
}) {
  const connected = connection.status === "connected" || connection.status === "reconnecting";

  return (
    <footer className="shrink-0 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] p-3 backdrop-blur-xl">
      {connection.audioBlocked ? (
        <button
          type="button"
          onClick={() => void connection.onResumeAudio()}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
        >
          <Volume2 className="h-4 w-4" />
          Включить звук собеседников
        </button>
      ) : null}
      {access.mode === "locked" && !session.inside ? (
        <p className="mb-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Комната закрыта для свободного входа.
        </p>
      ) : null}
      {connection.errorMessage ? (
        <p className="mb-2 text-center text-sm text-red-400" role="alert">
          {connection.errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <VoiceMediaControls
          compact={identity.active}
          mediaStatus={connection.status}
          micMuted={controls.micMuted}
          outputMuted={controls.outputMuted}
          mediaActionPending={controls.mediaActionPending}
          screenSharing={controls.screenSharing}
          screenSharePending={controls.screenSharePending}
          cameraEnabled={controls.cameraEnabled}
          cameraPending={controls.cameraPending}
          onMicToggle={controls.onMicToggle}
          onOutputToggle={controls.onOutputToggle}
          onScreenShareToggle={controls.onScreenShareToggle}
          onCameraToggle={controls.onCameraToggle}
        />
        {session.inside && connected ? (
          <IconButton
            label="Выйти из комнаты"
            disabled={session.leavePending}
            onClick={() => void session.onLeave()}
            className="grid h-11 w-11 place-items-center rounded-xl bg-red-500 text-white transition hover:bg-red-400 disabled:opacity-45"
          >
            <PhoneOff className="h-5 w-5" />
          </IconButton>
        ) : (
          <Button type="button" disabled={session.connectDisabled} onClick={() => void session.onConnect()}>
            {session.connectPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            {session.connectLabel}
          </Button>
        )}
      </div>
      {session.inside && !connected ? (
        <button
          type="button"
          disabled={session.leavePending}
          onClick={() => void session.onLeave()}
          className="mt-2 w-full rounded-xl py-1 text-xs text-[var(--app-muted)] transition hover:text-[var(--foreground)]"
        >
          Закрыть участие
        </button>
      ) : null}
    </footer>
  );
}
