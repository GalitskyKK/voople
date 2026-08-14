"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import {
  RemoteAudioTrack,
  Track,
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
  const screenShareVolumeRef = useRef(1);
  const [outputMuted, setOutputMuted] = useState(false);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [screenShareVolume, setScreenShareVolumeState] = useState(1);

  const applyParticipantVolume = useCallback(
    (participant: RemoteParticipant, volume: number) => {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track instanceof RemoteAudioTrack) {
          publication.track.setVolume(
            publication.source === Track.Source.ScreenShareAudio
              ? (outputMutedRef.current ? 0 : screenShareVolumeRef.current)
              : volume,
          );
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
            : track.source === Track.Source.ScreenShareAudio
              ? screenShareVolumeRef.current
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
        for (const publication of participant.trackPublications.values()) {
          if (
            publication.source !== Track.Source.ScreenShareAudio &&
            publication.track instanceof RemoteAudioTrack
          ) {
            publication.track.setVolume(outputMutedRef.current ? 0 : next);
          }
        }
      }
    },
    [roomRef],
  );

  const setScreenShareVolume = useCallback((volume: number) => {
    const next = clampVolume(volume);
    screenShareVolumeRef.current = next;
    setScreenShareVolumeState(next);
    roomRef.current?.remoteParticipants.forEach((participant) => {
      for (const publication of participant.trackPublications.values()) {
        if (publication.source === Track.Source.ScreenShareAudio && publication.track instanceof RemoteAudioTrack) {
          publication.track.setVolume(outputMutedRef.current ? 0 : next);
        }
      }
    });
  }, [roomRef]);

  return {
    audioContainerRef,
    outputMuted,
    participantVolumes,
    screenShareVolume,
    attachAudio,
    clearAudio,
    toggleOutput,
    setParticipantVolume,
    setScreenShareVolume,
  };
}
