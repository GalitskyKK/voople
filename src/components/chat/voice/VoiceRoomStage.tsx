"use client";

import type { RefObject } from "react";

import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView } from "@/types/chat";

import { VoiceMediaStage } from "./VoiceMediaStage";
import { VoiceParticipantCard } from "./VoiceParticipantCard";

type VoiceRoomStageProps = {
  screenContainerRef: RefObject<HTMLDivElement | null>;
  screenShareOwner: string | null;
  participants: ChatRoomParticipantView[];
  participantVolumes: Record<string, number>;
  micMuted: boolean;
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
  participants,
  participantVolumes,
  micMuted,
  remoteMicMutedById,
  activeSpeakerIds,
  cameraParticipantIds,
  onCameraContainerChange,
  onParticipantVolumeChange,
}: VoiceRoomStageProps) {
  const participantCards = participants.map((participant) => (
    <VoiceParticipantCard
      key={participant.id}
      participant={participant}
      muted={participant.isMe
        ? micMuted
        : (remoteMicMutedById[participant.id] ?? participant.micMuted)}
      speaking={activeSpeakerIds.has(participant.id)}
      volume={participantVolumes[participant.id] ?? 1}
      hasCamera={cameraParticipantIds.has(participant.id)}
      onCameraContainerChange={onCameraContainerChange}
      onVolumeChange={(volume) => onParticipantVolumeChange(participant.id, volume)}
      compact={Boolean(screenShareOwner)}
    />
  ));

  if (screenShareOwner) {
    return (
      <div className="mt-5 grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <VoiceMediaStage
          screenContainerRef={screenContainerRef}
          screenShareOwner={screenShareOwner}
        />
        <div className="voople-scroll grid max-h-52 grid-cols-2 gap-2 overflow-y-auto lg:max-h-[min(56dvh,32rem)] lg:grid-cols-1">
          {participantCards}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-5 grid gap-2",
        participants.length === 1 && "mx-auto max-w-xl grid-cols-1",
        participants.length === 2 && "sm:grid-cols-2",
        participants.length >= 3 && participants.length <= 4 && "sm:grid-cols-2",
        participants.length >= 5 && "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {participantCards}
    </div>
  );
}
