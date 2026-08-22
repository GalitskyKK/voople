import {
  AudioPresets,
  ConnectionQuality,
  DefaultReconnectPolicy,
  ScreenSharePresets,
  Track,
  type AudioCaptureOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
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

export const VOICE_PUBLISH_OPTIONS = {
  audioPreset: AudioPresets.musicHighQuality,
  // Continuous Opus avoids clipping the first syllable after silence. It uses
  // a little more traffic, which is acceptable for a voice-first desktop app.
  dtx: false,
  red: true,
} as const;

export type ScreenShareQuality = "standard" | "plus";

/**
 * Ask Chromium for audio belonging to the surface explicitly selected by the
 * user. `restrictOwnAudio` is best-effort and currently
 * Chromium-only; the desktop native publisher remains the authoritative way
 * to isolate one Windows process and its children.
 */
const SELECTED_SURFACE_AUDIO = {
  autoGainControl: false,
  channelCount: { ideal: 2 },
  echoCancellation: false,
  noiseSuppression: false,
  restrictOwnAudio: true,
  sampleRate: { ideal: 48_000 },
} satisfies AudioCaptureOptions;

const SCREEN_SHARE_BASE = {
  // Preselect applications/windows without removing tabs or full screens.
  // The selected surface still comes exclusively from the browser picker.
  video: { displaySurface: "window" },
  contentHint: "detail",
  selfBrowserSurface: "exclude",
  systemAudio: "include",
  surfaceSwitching: "include",
} as const;

export type VoopleDisplayMediaOptions = DisplayMediaStreamOptions & {
  monitorTypeSurfaces?: "include" | "exclude";
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
  windowAudio?: "exclude" | "system" | "window";
};

export function getBrowserDisplayMediaOptions(
  quality: ScreenShareQuality,
): VoopleDisplayMediaOptions {
  const resolution = quality === "plus"
    ? { width: 1920, height: 1080, frameRate: 60 }
    : ScreenSharePresets.h720fps30.resolution;
  return {
    audio: SELECTED_SURFACE_AUDIO,
    video: {
      displaySurface: "window",
      width: { ideal: resolution.width },
      height: { ideal: resolution.height },
      frameRate: resolution.frameRate,
    },
    monitorTypeSurfaces: "include",
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    systemAudio: "include",
    // Newer Chromium builds can offer audio belonging only to the selected
    // application window. Older browsers safely ignore this picker hint.
    windowAudio: "window",
  };
}

export function getScreenShareCaptureOptions(
  quality: ScreenShareQuality,
  nativeProcessAudio = false,
): ScreenShareCaptureOptions {
  return {
    ...SCREEN_SHARE_BASE,
    audio: nativeProcessAudio ? false : SELECTED_SURFACE_AUDIO,
    resolution:
      quality === "plus"
        ? { width: 1920, height: 1080, frameRate: 60 }
        : ScreenSharePresets.h720fps30.resolution,
  };
}

export function getScreenSharePublishOptions(
  quality: ScreenShareQuality,
): TrackPublishOptions {
  return {
    screenShareEncoding:
      quality === "plus"
        ? { maxBitrate: 8_000_000, maxFramerate: 60, priority: "high" }
        : ScreenSharePresets.h720fps30.encoding,
    degradationPreference: "maintain-resolution",
    simulcast: true,
  };
}

export function getAudioCaptureOptions(preferences: VoicePreferences): AudioCaptureOptions {
  return {
    deviceId:
      preferences.inputDeviceId === "default"
        ? { ideal: "default" }
        : { exact: preferences.inputDeviceId },
    echoCancellation: preferences.echoCancellation,
    noiseSuppression:
      preferences.enhancedNoiseSuppression ? false : preferences.noiseSuppression,
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
