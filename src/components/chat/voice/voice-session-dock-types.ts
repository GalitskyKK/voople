import type { ReactNode } from "react";
import type { ConnectionQuality } from "livekit-client";

import type { MediaStatus } from "./voice-room-config";

export type VoiceDockMode = "mini" | "compact" | "minimal";

export type VoiceSessionDockProps = {
  chatName: string;
  participantCount: number;
  activeSpeakerName: string | null;
  durationLabel: string | null;
  mediaStatus: MediaStatus;
  connectionLabel: string | null;
  connectionQuality: ConnectionQuality;
  micMuted: boolean;
  outputMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  mediaActionPending: boolean;
  leavePending: boolean;
  mediaPreview?: ReactNode;
  onOpen: () => void;
  onToggleMic: () => void;
  onToggleOutput: () => void;
  onLeave: () => void;
};

export type VoiceCollapsedDockProps = Pick<
  VoiceSessionDockProps,
  | "chatName"
  | "participantCount"
  | "activeSpeakerName"
  | "durationLabel"
  | "mediaStatus"
  | "connectionLabel"
  | "micMuted"
  | "cameraEnabled"
  | "screenSharing"
  | "mediaActionPending"
  | "leavePending"
  | "onOpen"
  | "onToggleMic"
  | "onLeave"
> & {
  onModeChange: (mode: VoiceDockMode) => void;
};
