"use client";

import { useEffect } from "react";
import type { VoiceSessionParticipants } from "@/types/voice-session-participants";
import type { ChatRoomController } from "./useChatRoomControl";

/** Publishes existing runtime state; owns no LiveKit events or volume preferences. */
export function useVoiceParticipantBridge(
  sessionId: string | undefined,
  controller: ChatRoomController,
  publish?: (value: VoiceSessionParticipants | null) => void,
) {
  const { stage, controls, session, connection } = controller.sheet;
  const { participants, remoteMicMutedById, cameraParticipantIds, activeSpeakerIds,
    participantVolumes, onParticipantVolumeChange } = stage;
  const { micMuted } = controls;
  const { inside } = session;
  const connected = connection.status === "connected";
  useEffect(() => {
    publish?.(sessionId && inside ? {
      sessionId,
      participants: Object.fromEntries(participants.map((person) => [person.id, {
        isMe: person.isMe,
        muted: person.isMe ? micMuted : (remoteMicMutedById[person.id] ?? person.micMuted),
        camera: connected && cameraParticipantIds.has(person.id),
        speaking: connected && activeSpeakerIds.has(person.id),
        volume: participantVolumes[person.id] ?? 1,
      }])),
      setParticipantVolume: onParticipantVolumeChange,
    } : null);
  }, [sessionId, inside, participants, micMuted, remoteMicMutedById, cameraParticipantIds,
    activeSpeakerIds, participantVolumes, onParticipantVolumeChange, connected, publish]);
  useEffect(() => () => publish?.(null), [publish]);
}
