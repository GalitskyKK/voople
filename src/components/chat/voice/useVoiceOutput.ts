"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  RemoteAudioTrack,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type Room,
} from "livekit-client";
import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

function clampVolume(value: number) {
  return Math.min(2, Math.max(0, value));
}

export function useVoiceOutput(
  roomRef: RefObject<Room | null>,
  preferences: VoicePreferences,
  persistPreferences: (patch: Partial<VoicePreferences>) => VoicePreferences,
) {
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const outputMutedRef = useRef(false);
  const outputGainRef = useRef(preferences.outputGain / 100);
  const screenShareVolumeRef = useRef(preferences.screenShareVolume / 100);
  const [outputMuted, setOutputMuted] = useState(false);
  const [outputGain, setOutputGainState] = useState(preferences.outputGain / 100);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(preferences.participantVolumes).map(([id, value]) => [id, value / 100])),
  );
  const participantVolumesRef = useRef(participantVolumes);
  const [screenShareVolume, setScreenShareVolumeState] = useState(preferences.screenShareVolume / 100);

  const effectiveVolume = useCallback((volume: number) => (
    outputMutedRef.current ? 0 : clampVolume(volume * outputGainRef.current)
  ), []);

  const applyParticipantVolume = useCallback(
    (participant: RemoteParticipant, volume: number) => {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track instanceof RemoteAudioTrack) {
          publication.track.setVolume(
            publication.source === Track.Source.ScreenShareAudio
              ? effectiveVolume(screenShareVolumeRef.current)
              : effectiveVolume(volume),
          );
        }
      }
    },
    [effectiveVolume],
  );

  const attachAudio = useCallback(
    (track: RemoteTrack, participant: RemoteParticipant) => {
      const element = track.attach();
      element.autoplay = true;
      element.dataset.livekitAudio = "true";
      if (track instanceof RemoteAudioTrack) {
        track.setVolume(
          track.source === Track.Source.ScreenShareAudio
            ? effectiveVolume(screenShareVolumeRef.current)
            : effectiveVolume(participantVolumesRef.current[participant.identity] ?? 1),
        );
      }
      audioContainerRef.current?.appendChild(element);
    },
    [effectiveVolume],
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
        participantVolumesRef.current[participant.identity] ?? 1,
      );
    });
  }, [applyParticipantVolume, roomRef]);

  const setParticipantVolume = useCallback(
    (participantId: string, volume: number) => {
      const next = clampVolume(volume);
      const reordered = { ...participantVolumesRef.current };
      delete reordered[participantId];
      participantVolumesRef.current = { ...reordered, [participantId]: next };
      setParticipantVolumes(participantVolumesRef.current);
      persistPreferences({
        participantVolumes: Object.fromEntries(
          Object.entries(participantVolumesRef.current).map(([id, value]) => [id, Math.round(value * 100)]),
        ),
      });

      const participant = roomRef.current?.remoteParticipants.get(participantId);
      if (participant) {
        for (const publication of participant.trackPublications.values()) {
          if (
            publication.source !== Track.Source.ScreenShareAudio &&
            publication.track instanceof RemoteAudioTrack
          ) {
            publication.track.setVolume(effectiveVolume(next));
          }
        }
      }
    },
    [effectiveVolume, persistPreferences, roomRef],
  );

  const setScreenShareVolume = useCallback((volume: number) => {
    const next = clampVolume(volume);
    screenShareVolumeRef.current = next;
    setScreenShareVolumeState(next);
    persistPreferences({ screenShareVolume: Math.round(next * 100) });
    roomRef.current?.remoteParticipants.forEach((participant) => {
      for (const publication of participant.trackPublications.values()) {
        if (publication.source === Track.Source.ScreenShareAudio && publication.track instanceof RemoteAudioTrack) {
          publication.track.setVolume(effectiveVolume(next));
        }
      }
    });
  }, [effectiveVolume, persistPreferences, roomRef]);

  const setOutputGain = useCallback((volume: number) => {
    const next = clampVolume(volume);
    outputGainRef.current = next;
    setOutputGainState(next);
    persistPreferences({ outputGain: Math.round(next * 100) });
    roomRef.current?.remoteParticipants.forEach((participant) => {
      applyParticipantVolume(
        participant,
        participantVolumesRef.current[participant.identity] ?? 1,
      );
    });
  }, [applyParticipantVolume, persistPreferences, roomRef]);

  useEffect(() => {
    outputGainRef.current = preferences.outputGain / 100;
    screenShareVolumeRef.current = preferences.screenShareVolume / 100;
  }, [preferences.outputGain, preferences.screenShareVolume]);

  return {
    audioContainerRef,
    outputMuted,
    outputGain,
    participantVolumes,
    screenShareVolume,
    attachAudio,
    clearAudio,
    toggleOutput,
    setOutputGain,
    setParticipantVolume,
    setScreenShareVolume,
  };
}
