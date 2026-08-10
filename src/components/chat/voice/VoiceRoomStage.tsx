"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ChatRoomParticipantView } from "@/types/chat";

import { VoiceMediaStage } from "./VoiceMediaStage";
import { VoiceParticipantCard } from "./VoiceParticipantCard";

type VoiceRoomStageProps = {
  screenContainerRef: (element: HTMLDivElement | null) => void;
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
  const [layout, setLayout] = useState<"focus" | "grid">("focus");
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
  const focusMedia = (mediaId: string) => {
    setFocusedMediaId(mediaId);
    setLayout("focus");
  };

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
      <div className="mt-5 min-h-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-[var(--app-muted)]">
            {layout === "focus" ? "Фокус" : "Сетка"}
          </p>
          <div className="flex rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-1">
            <button
              type="button"
              onClick={() => setLayout("focus")}
              className={cn(
                "grid h-8 w-9 place-items-center rounded-lg transition",
                layout === "focus" && "bg-[var(--app-surface)] text-(--theme-accent) shadow-sm",
              )}
              aria-label="Показывать выбранное видео крупно"
              aria-pressed={layout === "focus"}
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={cn(
                "grid h-8 w-9 place-items-center rounded-lg transition",
                layout === "grid" && "bg-[var(--app-surface)] text-(--theme-accent) shadow-sm",
              )}
              aria-label="Показывать все видео сеткой"
              aria-pressed={layout === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {layout === "focus" ? (
          <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="min-w-0">
              {activeFocusId === "screen" && screenShareOwner ? (
                <VoiceMediaStage
                  screenContainerRef={screenContainerRef}
                  screenShareOwner={screenShareOwner}
                  focused
                />
              ) : focusedParticipant ? (
                renderParticipant(focusedParticipant, "focused")
              ) : null}
            </div>
            <div className="grid max-h-[min(56dvh,32rem)] grid-cols-2 gap-2 overflow-y-auto lg:grid-cols-1">
              {screenShareOwner && activeFocusId !== "screen" ? (
                <VoiceMediaStage
                  screenContainerRef={screenContainerRef}
                  screenShareOwner={screenShareOwner}
                  onFocus={() => focusMedia("screen")}
                />
              ) : null}
              {remainingParticipants.map((participant) => renderParticipant(participant))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 grid-cols-2 gap-2 lg:grid-cols-3">
            {screenShareOwner ? (
              <VoiceMediaStage
                screenContainerRef={screenContainerRef}
                screenShareOwner={screenShareOwner}
                onFocus={() => focusMedia("screen")}
              />
            ) : null}
            {participants.map((participant) => renderParticipant(participant))}
          </div>
        )}
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
      {participants.map((participant) => renderParticipant(participant))}
    </div>
  );
}
