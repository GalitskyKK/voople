"use client";

import { useRef, useState, type MutableRefObject } from "react";
import { Track, type Room } from "livekit-client";

import { syncVoiceTrackProcessor } from "@/lib/livekit/rnnoise-track-processor";
import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

import {
  getAudioCaptureOptions,
  getMicrophoneMuted,
  VOICE_PUBLISH_OPTIONS,
  type MediaStatus,
  type ScreenShareQuality,
} from "./voice-room-config";

type DesktopScreenShareToggle = (
  room: Room,
  sharing: boolean,
  processId: number | null,
  quality: ScreenShareQuality,
) => Promise<{ enabled: boolean; warning: string | null }>;

export function useVoiceMediaActions({
  roomRef,
  preferencesRef,
  desiredMicMutedRef,
  screenShareQualityRef,
  mediaStatus,
  screenSharing,
  cameraEnabled,
  setMicMuted,
  setScreenSharing,
  setCameraEnabled,
  clearLocalCamera,
  refreshDevices,
  sendHeartbeat,
  toggleDesktopScreenAudio,
  setError,
}: {
  roomRef: MutableRefObject<Room | null>;
  preferencesRef: MutableRefObject<VoicePreferences>;
  desiredMicMutedRef: MutableRefObject<boolean>;
  screenShareQualityRef: MutableRefObject<ScreenShareQuality>;
  mediaStatus: MediaStatus;
  screenSharing: boolean;
  cameraEnabled: boolean;
  setMicMuted: (muted: boolean | ((current: boolean) => boolean)) => void;
  setScreenSharing: (enabled: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  clearLocalCamera: () => void;
  refreshDevices: () => Promise<void>;
  sendHeartbeat: () => Promise<unknown>;
  toggleDesktopScreenAudio: DesktopScreenShareToggle;
  setError: (message: string | null) => void;
}) {
  const actionRef = useRef(false);
  const [mediaActionPending, setMediaActionPending] = useState(false);
  const [screenSharePending, setScreenSharePending] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);

  const toggleMicrophone = async () => {
    if (actionRef.current) return;
    const room = roomRef.current;
    if (!room || mediaStatus !== "connected") {
      setMicMuted((muted) => {
        desiredMicMutedRef.current = !muted;
        return !muted;
      });
      return;
    }

    actionRef.current = true;
    setMediaActionPending(true);
    setError(null);
    const targetEnabled = getMicrophoneMuted(room);
    try {
      await room.localParticipant.setMicrophoneEnabled(
        targetEnabled,
        getAudioCaptureOptions(preferencesRef.current),
        VOICE_PUBLISH_OPTIONS,
      );
      const processorError = await syncVoiceTrackProcessor(room, {
        rnnoiseEnabled: preferencesRef.current.enhancedNoiseSuppression,
        microphoneGain: preferencesRef.current.microphoneGain,
      });
      if (processorError) setError(processorError);
      const actualMuted = getMicrophoneMuted(room);
      desiredMicMutedRef.current = actualMuted;
      setMicMuted(actualMuted);
      if (actualMuted === targetEnabled) {
        throw new Error("Медиасервер не подтвердил изменение микрофона");
      }
      void sendHeartbeat();
      await refreshDevices();
    } catch (cause) {
      setMicMuted(getMicrophoneMuted(room));
      setError(
        cause instanceof Error && cause.message.includes("timed out")
          ? "Сервер не подтвердил публикацию микрофона. Переподключитесь или включите совместимый режим."
          : cause instanceof Error
            ? cause.message
            : "Не удалось изменить состояние микрофона.",
      );
    } finally {
      actionRef.current = false;
      setMediaActionPending(false);
    }
  };

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room || mediaStatus !== "connected" || screenSharePending) return;
    setScreenSharePending(true);
    setError(null);
    try {
      const result = await toggleDesktopScreenAudio(
        room,
        screenSharing,
        preferencesRef.current.screenAudioProcessId,
        screenShareQualityRef.current,
      );
      setScreenSharing(result.enabled);
      if (result.warning) setError(result.warning);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось включить демонстрацию экрана.");
    } finally {
      setScreenSharePending(false);
    }
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || mediaStatus !== "connected" || cameraPending) return;
    setCameraPending(true);
    setError(null);
    const enabling = !cameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(enabling);
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const enabled = Boolean(publication && !publication.isMuted);
      setCameraEnabled(enabled);
      if (!enabled) clearLocalCamera();
    } catch (cause) {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setCameraEnabled(Boolean(publication && !publication.isMuted));
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось включить камеру. Проверьте разрешение браузера.",
      );
    } finally {
      if (!enabling) clearLocalCamera();
      setCameraPending(false);
    }
  };

  return {
    mediaActionPending,
    screenSharePending,
    cameraPending,
    toggleMicrophone,
    toggleScreenShare,
    toggleCamera,
  };
}
