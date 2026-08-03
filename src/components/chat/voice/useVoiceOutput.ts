"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import {
  RemoteAudioTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type Room,
} from "livekit-client";

function clampVolume(value: number) {
  return Math.min(2, Math.max(0, value));
}

export function useVoiceOutput(roomRef: RefObject<Room | null>) {
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const outputMutedRef = useRef(false);
  const participantVolumesRef = useRef<Record<string, number>>({});
  const [outputMuted, setOutputMuted] = useState(false);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});

  const applyParticipantVolume = useCallback(
    (participant: RemoteParticipant, volume: number) => {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track instanceof RemoteAudioTrack) {
          publication.track.setVolume(volume);
        }
      }
    },
    [],
  );

  const attachAudio = useCallback(
    (track: RemoteTrack, participant: RemoteParticipant) => {
      const element = track.attach();
      element.autoplay = true;
      element.dataset.livekitAudio = "true";
      if (track instanceof RemoteAudioTrack) {
        track.setVolume(
          outputMutedRef.current
            ? 0
            : (participantVolumesRef.current[participant.identity] ?? 1),
        );
      }
      audioContainerRef.current?.appendChild(element);
    },
    [],
  );

  const clearAudio = useCallback(() => {
    audioContainerRef.current?.replaceChildren();
    outputMutedRef.current = false;
    setOutputMuted(false);
  }, []);

  const toggleOutput = useCallback(() => {
    const next = !outputMutedRef.current;
    outputMutedRef.current = next;
    setOutputMuted(next);
    roomRef.current?.remoteParticipants.forEach((participant) => {
      applyParticipantVolume(
        participant,
        next ? 0 : (participantVolumesRef.current[participant.identity] ?? 1),
      );
    });
  }, [applyParticipantVolume, roomRef]);

  const setParticipantVolume = useCallback(
    (participantId: string, volume: number) => {
      const next = clampVolume(volume);
      participantVolumesRef.current = {
        ...participantVolumesRef.current,
        [participantId]: next,
      };
      setParticipantVolumes(participantVolumesRef.current);

      const participant = roomRef.current?.remoteParticipants.get(participantId);
      if (participant) {
        applyParticipantVolume(participant, outputMutedRef.current ? 0 : next);
      }
    },
    [applyParticipantVolume, roomRef],
  );

  return {
    audioContainerRef,
    outputMuted,
    participantVolumes,
    attachAudio,
    clearAudio,
    toggleOutput,
    setParticipantVolume,
  };
}
