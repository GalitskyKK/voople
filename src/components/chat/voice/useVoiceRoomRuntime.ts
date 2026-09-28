"use client";

import type { RefObject } from "react";
import type { Room } from "livekit-client";

import type {
  CoreVoiceSessionDescriptor,
  EnabledVoiceMediaCredentials,
} from "@/types/voice";

import { useVoiceHeartbeat } from "./useVoiceHeartbeat";
import { useVoiceRoomServerAdapter } from "./useVoiceRoomServerAdapter";

export function useVoiceRoomRuntime({
  chatId,
  open,
  coreSession,
  initialCoreCredentials,
  roomRef,
  cameraEnabled,
  screenSharing,
}: {
  chatId: string;
  open: boolean;
  coreSession?: CoreVoiceSessionDescriptor;
  initialCoreCredentials?: EnabledVoiceMediaCredentials;
  roomRef: RefObject<Room | null>;
  cameraEnabled: boolean;
  screenSharing: boolean;
}) {
  const server = useVoiceRoomServerAdapter({
    chatId,
    open,
    coreSession,
    initialCoreCredentials,
  });
  const value = server.room.data;
  const inside = Boolean(value?.isInside);
  const participants = value?.participants ?? [];
  const heartbeat = useVoiceHeartbeat(
    server.heartbeatSessionId
      ? {
          kind: "core",
          sessionId: server.heartbeatSessionId,
          cameraEnabled,
          screenSharing,
        }
      : { kind: "legacy", chatId },
    inside,
    roomRef,
  );

  return {
    server,
    value,
    inside,
    participants,
    participantCount: participants.length,
    active: value?.status === "active" || value?.status === "ringing",
    heartbeat,
  };
}
