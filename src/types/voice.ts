export type DisabledVoiceMediaCredentials = {
  enabled: false;
  screenShareQuality: "standard" | "plus";
  expiresAt: null;
  refreshAfter: null;
};

export type EnabledVoiceMediaCredentials = {
  enabled: true;
  url: string;
  endpoints: Array<{ url: string; label: string }>;
  token: string;
  expiresAt: string;
  refreshAfter: string;
  screenShareQuality: "standard" | "plus";
};

export type VoiceMediaCredentials =
  | DisabledVoiceMediaCredentials
  | EnabledVoiceMediaCredentials;

export type VoiceSessionLease = VoiceMediaCredentials;

export type CoreVoiceSessionDescriptor = {
  groupId: string;
  room: GroupNowRoom;
  join: GroupRoomJoinResult;
};

export type CoreVoiceSessionLaunch = CoreVoiceSessionDescriptor & {
  credentials: EnabledVoiceMediaCredentials;
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
import type { GroupNowRoom } from "./group-now";
import type { GroupRoomJoinResult } from "./group-room-mutations";
