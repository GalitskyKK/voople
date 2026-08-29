import type { ReactNode } from "react";
import type { ConnectionQuality } from "livekit-client";

import type { ChatRoomParticipantView, GroupSoundView } from "@/types/chat";
import type { VoiceRoomSurfacePhase } from "./voice-room-surface";

import type { MediaStatus } from "./voice-room-config";

export type VoiceRoomIdentityModel = {
  isDirect: boolean;
  callPhase: "idle" | "dialing" | "ringing" | "connected" | "ended" | null;
  chatName: string;
  active: boolean;
  durationLabel: string | null;
};

export type VoiceRoomConnectionModel = {
  label: string | null;
  status: MediaStatus;
  quality: ConnectionQuality;
  audioBlocked: boolean;
  errorMessage: string | null;
  onResumeAudio: () => void | Promise<void>;
};

export type VoiceRoomStageModel = {
  screenContainerRef: (element: HTMLDivElement | null) => void;
  screenShareOwner: string | null;
  screenShareAvailable: string | null;
  screenShareTrackId: string | null;
  screenShareIsLocal: boolean;
  watchingScreenShare: boolean;
  screenShareVolume: number;
  participants: ChatRoomParticipantView[];
  groupSounds: GroupSoundView[];
  participantVolumes: Record<string, number>;
  remoteMicMutedById: Record<string, boolean>;
  activeSpeakerIds: ReadonlySet<string>;
  cameraParticipantIds: ReadonlySet<string>;
  onCameraContainerChange: (participantId: string, element: HTMLDivElement | null) => void;
  onParticipantVolumeChange: (participantId: string, volume: number) => void;
  onScreenShareVolumeChange: (volume: number) => void;
  onGroupSoundPlay: (sound: GroupSoundView) => void;
  onWatchScreenShare: () => void;
  onStopWatchingScreenShare: () => void;
};

export type VoiceRoomControlsModel = {
  micMuted: boolean;
  outputMuted: boolean;
  mediaActionPending: boolean;
  screenSharePending: boolean;
  screenSharing: boolean;
  screenShareHasAudio: boolean;
  cameraEnabled: boolean;
  cameraPending: boolean;
  onMicToggle: () => void | Promise<void>;
  onOutputToggle: () => void;
  onScreenShareToggle: () => void | Promise<void>;
  onCameraToggle: () => void | Promise<void>;
};

export type VoiceRoomAccessModel = {
  canManage: boolean;
  mode: "open" | "locked";
  pending: boolean;
  onToggle: () => void;
};

export type VoiceRoomSessionModel = {
  phase: VoiceRoomSurfacePhase;
  inside: boolean;
  leavePending: boolean;
  onLeave: () => void | Promise<void>;
  connectPending: boolean;
  connectDisabled: boolean;
  onConnect: () => void | Promise<void>;
  connectLabel: string;
  retryLabel: string;
  retryPending: boolean;
  onRetry: () => void | Promise<void>;
};

export type VoiceRoomSheetProps = {
  overlay: { open: boolean; onClose: () => void };
  identity: VoiceRoomIdentityModel;
  connection: VoiceRoomConnectionModel;
  stage: VoiceRoomStageModel;
  controls: VoiceRoomControlsModel;
  access: VoiceRoomAccessModel;
  session: VoiceRoomSessionModel;
  settingsPanel: ReactNode;
};
