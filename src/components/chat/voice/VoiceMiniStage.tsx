"use client";

import { Maximize2, Mic, MonitorUp } from "lucide-react";

import type { ChatRoomParticipantView } from "@/types/chat";

type VoiceMiniStageProps = {
  screenContainerRef: (element: HTMLDivElement | null) => void;
  screenShareOwner: string | null;
  participants: ChatRoomParticipantView[];
  activeSpeakerIds: ReadonlySet<string>;
  cameraParticipantIds: ReadonlySet<string>;
  onCameraContainerChange: (
    participantId: string,
    element: HTMLDivElement | null,
  ) => void;
  onOpen: () => void;
};

export function VoiceMiniStage({
  screenContainerRef,
  screenShareOwner,
  participants,
  activeSpeakerIds,
  cameraParticipantIds,
  onCameraContainerChange,
  onOpen,
}: VoiceMiniStageProps) {
  const cameraParticipant = participants.find((participant) =>
    cameraParticipantIds.has(participant.id),
  );
  const activeParticipant =
    participants.find((participant) => activeSpeakerIds.has(participant.id)) ??
    participants.find((participant) => !participant.isMe) ??
    participants[0];

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {screenShareOwner ? (
        <div
          ref={screenContainerRef}
          data-voople-screen-stage=""
          className="absolute inset-0 flex min-h-0 min-w-0 items-center justify-center overflow-hidden [&>video]:block [&>video]:h-full [&>video]:min-h-0 [&>video]:w-full [&>video]:min-w-0 [&>video]:max-h-full [&>video]:max-w-full [&>video]:object-contain [&>[data-livekit-local-screen]]:h-full [&>[data-livekit-local-screen]]:w-full"
        />
      ) : cameraParticipant ? (
        <div
          ref={(element) => onCameraContainerChange(cameraParticipant.id, element)}
          className="absolute inset-0"
        />
      ) : activeParticipant ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--theme-accent)_28%,transparent),transparent_62%),var(--app-surface-soft)]">
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="h-16 w-16 overflow-hidden rounded-full bg-[var(--app-accent-soft)] text-2xl font-semibold leading-[4rem] text-[var(--theme-accent)]">
              {activeParticipant.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- shared media preview for Next.js and Tauri
                <img src={activeParticipant.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                activeParticipant.displayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="max-w-full truncate text-sm font-medium">
              {activeParticipant.displayName}
            </span>
          </div>
        </div>
      ) : null}

      {screenShareOwner && cameraParticipant ? (
        <div className="absolute bottom-2 right-2 h-[38%] w-[34%] overflow-hidden rounded-lg border border-white/25 bg-black shadow-lg">
          <div
            ref={(element) => onCameraContainerChange(cameraParticipant.id, element)}
            className="absolute inset-0"
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-2 text-[11px] text-white">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {screenShareOwner ? <MonitorUp className="h-3.5 w-3.5 shrink-0" /> : null}
          {screenShareOwner ?? cameraParticipant?.displayName ?? activeParticipant?.displayName ?? "Разговор"}
        </span>
        <span className="flex items-center gap-2">
          {activeParticipant && activeSpeakerIds.has(activeParticipant.id) ? (
            <Mic className="h-3.5 w-3.5 text-emerald-400" aria-label="Говорит сейчас" />
          ) : null}
          <Maximize2 className="h-3.5 w-3.5 shrink-0" />
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 rounded-xl ring-inset transition focus-visible:ring-2 focus-visible:ring-(--theme-accent)"
        aria-label="Вернуться в окно комнаты"
      />
    </div>
  );
}
