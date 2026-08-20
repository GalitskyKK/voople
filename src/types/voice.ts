export type VoiceSessionLease = {
  enabled: boolean;
  url?: string;
  endpoints?: Array<{ url: string; label: string }>;
  token?: string;
  expiresAt: string | null;
  refreshAfter: string | null;
  screenShareQuality?: "standard" | "plus";
};

export type ScreenAudioSessionLease = {
  url: string;
  token: string;
  screenSessionId: string;
  expiresAt: string;
  refreshAfter: string;
};

export type VoicePreferencesV2 = {
  inputDeviceId: string;
  outputDeviceId: string;
  endpointUrl: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  voiceIsolation: boolean;
  enhancedNoiseSuppression: boolean;
  roomSounds: boolean;
  compatibilityMode: boolean;
  screenAudioProcessId: number | null;
  microphoneGain: number;
  outputGain: number;
  screenShareVolume: number;
  participantVolumes: Record<string, number>;
};
