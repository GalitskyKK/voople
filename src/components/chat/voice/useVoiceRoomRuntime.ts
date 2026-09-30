"use client";

import type { RefObject } from "react";
import type { Room } from "livekit-client";

import type {
  CoreVoiceSessionDescriptor,
  EnabledVoiceMediaCredentials,
} from "@/types/voice";

import { useVoiceHeartbeat } from "./useVoiceHeartbeat";
import { useVoiceRoomServerAdapter } from "./useVoiceRoomServerAdapter";
import type { CoreDirectCallTarget } from "./useCoreDirectCallServerAdapter";

export function useVoiceRoomRuntime({
  chatId,
  open,
  expectedStartedAt,
  coreSession,
  coreDirectCall,
  initialCoreCredentials,
  roomRef,
  cameraEnabled,
  screenSharing,
}: {
  chatId: string;
  open: boolean;
  expectedStartedAt?: string;
  coreSession?: CoreVoiceSessionDescriptor;
  coreDirectCall?: CoreDirectCallTarget;
  initialCoreCredentials?: EnabledVoiceMediaCredentials;
  roomRef: RefObject<Room | null>;
  cameraEnabled: boolean;
  screenSharing: boolean;
}) {
  const server = useVoiceRoomServerAdapter({
    chatId,
    open,
    expectedStartedAt,
    coreSession,
    coreDirectCall,
    initialCoreCredentials,
  });
  const value = server.room.data;
  const inside = Boolean(value?.isInside);
  const participants = value?.participants ?? [];
  const heartbeat = useVoiceHeartbeat(
    server.heartbeatSessionId
      ? {
          kind: coreDirectCall ? "core-direct" : "core",
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
    screenAudioTarget: coreSession
      ? { kind: "core" as const, sessionId: coreSession.join.sessionId }
      : coreDirectCall
        ? { kind: "core-direct" as const, sessionId: server.heartbeatSessionId ?? "" }
        : { kind: "legacy" as const, chatId },
    value,
    inside,
    participants,
    participantCount: participants.length,
    active: value?.status === "active" || value?.status === "ringing",
    heartbeat,
  };
}
