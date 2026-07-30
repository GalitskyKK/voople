export type VoicePreferences = {
  inputDeviceId: string;
  outputDeviceId: string;
  endpointUrl: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  voiceIsolation: boolean;
  compatibilityMode: boolean;
};

const STORAGE_KEY = "voople:voice-preferences:v1";

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  inputDeviceId: "default",
  outputDeviceId: "default",
  endpointUrl: "auto",
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  voiceIsolation: true,
  compatibilityMode: false,
};

export function loadVoicePreferences(): VoicePreferences {
  if (typeof window === "undefined") return DEFAULT_VOICE_PREFERENCES;

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<VoicePreferences>;
    return { ...DEFAULT_VOICE_PREFERENCES, ...stored };
  } catch {
    return DEFAULT_VOICE_PREFERENCES;
  }
}

export function saveVoicePreferences(preferences: VoicePreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
