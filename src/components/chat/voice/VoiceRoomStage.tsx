"use client";

import { useRef } from "react";
import { useVoiceStageLayout } from "./useVoiceStageLayout";
import { VoiceMediaLayoutControls } from "./VoiceMediaLayoutControls";

import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView } from "@/types/chat";

import { VoiceMediaStage } from "./VoiceMediaStage";
import { VoiceParticipantCard } from "./VoiceParticipantCard";
import { OrbitVoiceGrid } from "./OrbitVoiceGrid";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";

type VoiceRoomStageProps = {
  screenContainerRef: (element: HTMLDivElement | null) => void;
  screenShareOwner: string | null;
  screenShareTrackId: string | null;
  screenShareIsLocal: boolean;
  screenShareVolume: number;
  onScreenShareVolumeChange: (volume: number) => void;
  onStopWatchingScreenShare: () => void;
  participants: ChatRoomParticipantView[];
  participantVolumes: Record<string, number>;
  micMuted: boolean;
  localSpeaking: boolean;
  remoteMicMutedById: Record<string, boolean>;
  activeSpeakerIds: ReadonlySet<string>;
  cameraParticipantIds: ReadonlySet<string>;
  onCameraContainerChange: (
    participantId: string,
    element: HTMLDivElement | null,
  ) => void;
  onParticipantVolumeChange: (participantId: string, volume: number) => void;
};

export function VoiceRoomStage({
  screenContainerRef,
  screenShareOwner,
  screenShareTrackId,
  screenShareIsLocal,
  screenShareVolume,
  onScreenShareVolumeChange,
  onStopWatchingScreenShare,
  participants,
  participantVolumes,
  micMuted,
  localSpeaking,
  remoteMicMutedById,
  activeSpeakerIds,
  cameraParticipantIds,
  onCameraContainerChange,
  onParticipantVolumeChange,
}: VoiceRoomStageProps) {
  const orbit = useInterfaceDesign() === "orbit";
  const stageRef = useRef<HTMLDivElement>(null);
  const { activeFocusId, layout, focusMedia, selectLayout } = useVoiceStageLayout(screenShareTrackId, screenShareOwner, cameraParticipantIds, stageRef);
  const hasVisualMedia = Boolean(screenShareOwner) || cameraParticipantIds.size > 0;

  const renderParticipant = (
    participant: ChatRoomParticipantView,
    placement: "focused" | "tile" = "tile",
  ) => {
    const hasCamera = cameraParticipantIds.has(participant.id);
    const focused = placement === "focused";
    return (
      <VoiceParticipantCard
        key={participant.id}
        participant={participant}
        presentation={orbit ? hasVisualMedia ? "orbit-media" : "orbit" : "standard"}
        muted={participant.isMe
          ? micMuted
          : (remoteMicMutedById[participant.id] ?? participant.micMuted)}
        speaking={participant.isMe ? localSpeaking : activeSpeakerIds.has(participant.id)}
        volume={participantVolumes[participant.id] ?? 1}
        hasCamera={hasCamera}
        onCameraContainerChange={onCameraContainerChange}
        onVolumeChange={(volume) => onParticipantVolumeChange(participant.id, volume)}
        compact={hasVisualMedia && !focused}
        focused={focused}
        onFocus={hasCamera ? () => focusMedia(participant.id) : undefined}
      />
    );
  };

  if (hasVisualMedia) {
    const focusedParticipant = participants.find(
      (participant) => participant.id === activeFocusId,
    );
    const remainingParticipants = participants.filter(
      (participant) => layout === "grid" || participant.id !== activeFocusId,
    );

    return (
      <div ref={stageRef} data-media-layout={layout} className={cn(orbit && "voople-orbit-media-stage", "voople-full-room__stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")}>
        <VoiceMediaLayoutControls layout={layout} onChange={selectLayout} />

        {layout === "focus" ? (
          <div className="voople-media-focus-layout grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_5rem] gap-2">
            <div className="voople-media-focus-main min-h-0 min-w-0">
              {activeFocusId === "screen" && screenShareOwner ? (
                <VoiceMediaStage
                  screenContainerRef={screenContainerRef}
                  screenShareOwner={screenShareOwner}
                  volume={screenShareIsLocal ? undefined : screenShareVolume}
                  onVolumeChange={onScreenShareVolumeChange}
                  onStopWatching={onStopWatchingScreenShare}
                  focused
                  className="h-full"
                />
              ) : focusedParticipant ? (
                renderParticipant(focusedParticipant, "focused")
              ) : null}
            </div>
            <div className="voople-media-filmstrip grid min-h-0 grid-flow-col auto-cols-[minmax(7rem,10rem)] gap-2 overflow-x-auto overflow-y-hidden">
              {screenShareOwner && activeFocusId !== "screen" ? (
                <VoiceMediaStage
                  screenContainerRef={screenContainerRef}
                  screenShareOwner={screenShareOwner}
                  volume={screenShareIsLocal ? undefined : screenShareVolume}
                  onVolumeChange={onScreenShareVolumeChange}
                  onStopWatching={onStopWatchingScreenShare}
                  onFocus={() => focusMedia("screen")}
                  className="h-full"
                />
              ) : null}
              {remainingParticipants.map((participant) => renderParticipant(participant))}
            </div>
          </div>
        ) : (
          <div className="voople-media-grid grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto lg:grid-cols-3">
            {screenShareOwner ? (
              <VoiceMediaStage
                screenContainerRef={screenContainerRef}
                screenShareOwner={screenShareOwner}
                volume={screenShareIsLocal ? undefined : screenShareVolume}
                onVolumeChange={onScreenShareVolumeChange}
                onStopWatching={onStopWatchingScreenShare}
                onFocus={() => focusMedia("screen")}
              />
            ) : null}
            {participants.map((participant) => renderParticipant(participant))}
          </div>
        )}
      </div>
    );
  }

  if (orbit) return <OrbitVoiceGrid participants={participants} renderParticipant={renderParticipant} />;
  return (
    <div
      className={cn(
        "voople-full-room__stage grid min-h-0 min-w-0 flex-1 auto-rows-fr gap-2 overflow-y-auto [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]",
        participants.length === 1 && "mx-auto max-w-xl grid-cols-1",
        participants.length >= 5 && "lg:[grid-template-columns:repeat(3,minmax(0,1fr))]",
      )}
    >
      {participants.map((participant) => renderParticipant(participant))}
    </div>
  );
}
