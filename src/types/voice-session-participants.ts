/** Presentation snapshot from the single owned media runtime, never a volume store. */
export type VoiceSessionParticipantDetail = {
  isMe: boolean;
  muted: boolean;
  camera: boolean;
  speaking: boolean;
  volume: number;
};

export type VoiceSessionParticipants = {
  sessionId: string;
  participants: Record<string, VoiceSessionParticipantDetail>;
  setParticipantVolume: (participantId: string, volume: number) => void;
};
