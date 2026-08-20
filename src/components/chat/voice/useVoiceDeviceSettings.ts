"use client";

import { useCallback, useEffect, useState, type MutableRefObject } from "react";
import { LocalAudioTrack, Room, Track, type Room as LiveKitRoom } from "livekit-client";

import { syncVoiceTrackProcessor } from "@/lib/livekit/rnnoise-track-processor";
import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

import type { MediaStatus } from "./voice-room-config";
import { getMicrophoneMuted } from "./voice-room-config";
import { useVoiceMicTest } from "./useVoiceMicTest";

type AudioProcessingKey =
  | "echoCancellation"
  | "noiseSuppression"
  | "autoGainControl"
  | "voiceIsolation"
  | "enhancedNoiseSuppression";

export function useVoiceDeviceSettings({
  open,
  roomRef,
  mediaStatus,
  preferencesRef,
  persistPreferences,
  setMicMuted,
  setError,
}: {
  open: boolean;
  roomRef: MutableRefObject<LiveKitRoom | null>;
  mediaStatus: MediaStatus;
  preferencesRef: MutableRefObject<VoicePreferences>;
  persistPreferences: (patch: Partial<VoicePreferences>) => VoicePreferences;
  setMicMuted: (muted: boolean) => void;
  setError: (message: string | null) => void;
}) {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = useCallback(async (requestPermissions = false) => {
    try {
      const [inputs, outputs] = await Promise.all([
        Room.getLocalDevices("audioinput", requestPermissions),
        Room.getLocalDevices("audiooutput", false),
      ]);
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch {
      // Device labels can remain unavailable until microphone permission exists.
    }
  }, []);

  const micTest = useVoiceMicTest({ preferencesRef, refreshDevices, setError });

  useEffect(() => {
    if (!open) return;
    const initialRefresh = window.setTimeout(() => void refreshDevices(), 0);
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      window.clearTimeout(initialRefresh);
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [open, refreshDevices]);

  const changeInputDevice = async (deviceId: string) => {
    persistPreferences({ inputDeviceId: deviceId });
    const room = roomRef.current;
    if (!room || mediaStatus !== "connected") return;
    try {
      await room.switchActiveDevice("audioinput", deviceId);
      setMicMuted(getMicrophoneMuted(room));
    } catch {
      setError("Не удалось переключить микрофон.");
    }
  };

  const changeOutputDevice = async (deviceId: string) => {
    persistPreferences({ outputDeviceId: deviceId });
    const room = roomRef.current;
    if (!room || mediaStatus !== "connected") return;
    try {
      await room.switchActiveDevice("audiooutput", deviceId);
    } catch {
      setError("Этот браузер не поддерживает выбор устройства вывода.");
    }
  };

  const changeAudioProcessing = async (key: AudioProcessingKey, enabled: boolean) => {
    const next = persistPreferences(
      key === "enhancedNoiseSuppression"
        ? { enhancedNoiseSuppression: enabled, noiseSuppression: !enabled }
        : { [key]: enabled },
    );
    const room = roomRef.current;
    if (key === "enhancedNoiseSuppression" && room) {
      setError(await syncVoiceTrackProcessor(room, {
        rnnoiseEnabled: enabled,
        microphoneGain: next.microphoneGain,
      }));
    }
    const publication = room?.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!(publication?.track instanceof LocalAudioTrack)) return;
    try {
      await publication.track.applyConstraints({
        echoCancellation: next.echoCancellation,
        noiseSuppression: next.noiseSuppression,
        autoGainControl: next.autoGainControl,
        voiceIsolation: next.voiceIsolation,
      });
    } catch {
      setError("Браузер не смог применить эту обработку к активному микрофону.");
    }
  };

  const changeMicrophoneGain = async (microphoneGain: number) => {
    const next = persistPreferences({ microphoneGain });
    if (!roomRef.current) return;
    setError(await syncVoiceTrackProcessor(roomRef.current, {
      rnnoiseEnabled: next.enhancedNoiseSuppression,
      microphoneGain: next.microphoneGain,
    }));
  };

  return {
    inputDevices,
    outputDevices,
    refreshDevices,
    micTest,
    changeInputDevice,
    changeOutputDevice,
    changeAudioProcessing,
    changeMicrophoneGain,
  };
}
