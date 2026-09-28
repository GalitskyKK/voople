import type { VoiceControlState } from "../ChatRoomControl";

export const IDLE_VOICE_CONTROL_STATE = {
  inside: false,
  mediaStatus: "idle",
  participantCount: 0,
  micMuted: true,
  outputMuted: false,
} satisfies VoiceControlState;
