import type { VoicePreferencesV2 } from "@/types/voice";

export type VoicePreferences = VoicePreferencesV2;

const STORAGE_KEY_V1 = "voople:voice-preferences:v1";
const STORAGE_KEY_V2 = "voople:voice-preferences:v2";
const MAX_PARTICIPANT_VOLUMES = 100;

export const DEFAULT_VOICE_PREFERENCES: VoicePreferencesV2 = {
  inputDeviceId: "default",
  outputDeviceId: "default",
  endpointUrl: "auto",
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: true,
  voiceIsolation: true,
  enhancedNoiseSuppression: true,
  roomSounds: true,
  compatibilityMode: false,
  screenAudioProcessId: null,
  microphoneGain: 100,
  outputGain: 100,
  screenShareVolume: 100,
  participantVolumes: {},
};

function clampPercent(value: unknown, maximum: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, Math.round(value)))
    : fallback;
}

function sanitizeParticipantVolumes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([identity, volume]) => identity.length <= 160 && typeof volume === "number" && Number.isFinite(volume))
      .slice(-MAX_PARTICIPANT_VOLUMES)
      .map(([identity, volume]) => [identity, clampPercent(volume, 200, 100)]),
  );
}

function sanitizeVoicePreferences(value: unknown): VoicePreferencesV2 {
  const stored = value && typeof value === "object" ? value as Partial<VoicePreferencesV2> : {};
  const preferences: VoicePreferencesV2 = {
    ...DEFAULT_VOICE_PREFERENCES,
    ...stored,
    microphoneGain: clampPercent(stored.microphoneGain, 100, 100),
    outputGain: clampPercent(stored.outputGain, 200, 100),
    screenShareVolume: clampPercent(stored.screenShareVolume, 200, 100),
    participantVolumes: sanitizeParticipantVolumes(stored.participantVolumes),
    screenAudioProcessId:
      typeof stored.screenAudioProcessId === "number" && Number.isSafeInteger(stored.screenAudioProcessId)
        ? stored.screenAudioProcessId
        : null,
  };
  if (preferences.enhancedNoiseSuppression) preferences.noiseSuppression = false;
  return preferences;
}

export function loadVoicePreferences(): VoicePreferencesV2 {
  if (typeof window === "undefined") return DEFAULT_VOICE_PREFERENCES;

  try {
    const source = window.localStorage.getItem(STORAGE_KEY_V2)
      ?? window.localStorage.getItem(STORAGE_KEY_V1)
      ?? "{}";
    return sanitizeVoicePreferences(JSON.parse(source));
  } catch {
    return DEFAULT_VOICE_PREFERENCES;
  }
}

export function saveVoicePreferences(preferences: VoicePreferencesV2) {
  window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(sanitizeVoicePreferences(preferences)));
}
