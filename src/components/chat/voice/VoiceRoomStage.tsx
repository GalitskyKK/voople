"use client";

import { useState, type RefObject } from "react";

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
  const [focusedMediaId, setFocusedMediaId] = useState<string | null>(null);
  const hasVisualMedia = Boolean(screenShareOwner) || cameraParticipantIds.size > 0;
  const activeFocusId =
    (focusedMediaId === "screen" && screenShareOwner) ||
    (focusedMediaId !== "screen" &&
      focusedMediaId !== null &&
      cameraParticipantIds.has(focusedMediaId))
      ? focusedMediaId
      : screenShareOwner
        ? "screen"
        : [...cameraParticipantIds][0] ?? null;

  const renderParticipant = (participant: ChatRoomParticipantView) => {
    const hasCamera = cameraParticipantIds.has(participant.id);
    const focused = hasCamera && activeFocusId === participant.id;
    return (
      <VoiceParticipantCard
        key={participant.id}
        participant={participant}
        muted={participant.isMe
          ? micMuted
          : (remoteMicMutedById[participant.id] ?? participant.micMuted)}
        speaking={activeSpeakerIds.has(participant.id)}
        volume={participantVolumes[participant.id] ?? 1}
        hasCamera={hasCamera}
        onCameraContainerChange={onCameraContainerChange}
        onVolumeChange={(volume) => onParticipantVolumeChange(participant.id, volume)}
        compact={hasVisualMedia && !focused}
        focused={focused}
        onFocus={hasCamera ? () => setFocusedMediaId(participant.id) : undefined}
        className={focused ? "order-first" : "order-2"}
      />
    );
  };

  if (hasVisualMedia) {
    return (
      <div className="mt-5 grid min-h-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {screenShareOwner ? (
          <VoiceMediaStage
            screenContainerRef={screenContainerRef}
            screenShareOwner={screenShareOwner}
            focused={activeFocusId === "screen"}
            onFocus={() => setFocusedMediaId("screen")}
            className={activeFocusId === "screen" ? "order-first" : "order-2"}
          />
        ) : null}
        {participants.map(renderParticipant)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]",
        participants.length === 1 && "mx-auto max-w-xl grid-cols-1",
        participants.length >= 5 && "lg:[grid-template-columns:repeat(3,minmax(0,1fr))]",
      )}
    >
      {participants.map(renderParticipant)}
    </div>
  );
}
