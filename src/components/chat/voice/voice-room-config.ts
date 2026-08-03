import {
  ConnectionQuality,
  DefaultReconnectPolicy,
  Track,
  type AudioCaptureOptions,
  type Room,
} from "livekit-client";

import type { VoicePreferences } from "@/lib/livekit/voice-preferences";
import type { ChatRoomView } from "@/types/chat";

export type MediaStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "unavailable"
  | "error";

export type VoiceControlState = {
  inside: boolean;
  mediaStatus: MediaStatus;
  participantCount: number;
  micMuted: boolean;
  outputMuted: boolean;
};

export type LiveKitEndpoint = { url: string; label: string };

export const reconnectPolicy = new DefaultReconnectPolicy([
  0,
  300,
  1_200,
  2_700,
  4_800,
  ...Array.from({ length: 40 }, () => 7_000),
]);

export function getAudioCaptureOptions(preferences: VoicePreferences): AudioCaptureOptions {
  return {
    deviceId:
      preferences.inputDeviceId === "default"
        ? { ideal: "default" }
        : { exact: preferences.inputDeviceId },
    echoCancellation: preferences.echoCancellation,
    noiseSuppression: preferences.noiseSuppression,
    autoGainControl: preferences.autoGainControl,
    voiceIsolation: preferences.voiceIsolation,
    // Opus works internally at 48 kHz. Asking the capture stack for the same
    // rate avoids an unnecessary resampling pass when the device supports it,
    // while `ideal` keeps unusual microphones from failing to start.
    sampleRate: { ideal: 48_000 },
    sampleSize: { ideal: 16 },
    channelCount: { ideal: 1 },
    latency: { ideal: 0.02 },
  };
}

export function getMicrophoneMuted(room: Room | null) {
  if (!room) return true;
  const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  return !publication || publication.isMuted;
}

export function getConnectionLabel(status: MediaStatus) {
  switch (status) {
    case "connected":
      return "Голос подключён";
    case "connecting":
      return "Подключение…";
    case "reconnecting":
      return "Восстанавливаем связь…";
    case "unavailable":
      return "LiveKit не настроен";
    default:
      return null;
  }
}

export function getCallEndMessage(reason: ChatRoomView["endReason"]) {
  switch (reason) {
    case "declined":
      return "Собеседник отклонил звонок.";
    case "cancelled":
      return "Звонок отменён.";
    case "missed":
      return "На звонок не ответили.";
    default:
      return "Разговор завершён.";
  }
}

export function getQualityLabel(quality: ConnectionQuality) {
  switch (quality) {
    case ConnectionQuality.Excellent:
      return "Отличная";
    case ConnectionQuality.Good:
      return "Хорошая";
    case ConnectionQuality.Poor:
      return "Слабая";
    case ConnectionQuality.Lost:
      return "Нет связи";
    default:
      return "Проверяем";
  }
}
