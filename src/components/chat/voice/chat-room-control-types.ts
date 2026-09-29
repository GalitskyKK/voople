import type {
  CoreVoiceSessionDescriptor,
  EnabledVoiceMediaCredentials,
} from "@/types/voice";
import type { GroupNowRoomTarget } from "@/types/group-now";

import type { VoiceControlState } from "./voice-room-config";
import type { VoiceSessionParticipants } from "@/types/voice-session-participants";

export type ChatRoomControlProps = {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  expectedStartedAt?: string;
  renderTrigger?: boolean;
  initialOpen?: boolean;
  onStateChange?: (state: VoiceControlState) => void;
  onParticipantsChange?: (value: VoiceSessionParticipants | null) => void;
  onLeaveConfirmed?: (chatId: string, sessionId: string | null) => void;
  coreSession?: CoreVoiceSessionDescriptor;
  initialCoreCredentials?: EnabledVoiceMediaCredentials;
  onCoreRoomSwitch?: (target: GroupNowRoomTarget) => void | Promise<void>;
};

export type ChatRoomControlHandle = {
  open: () => void;
  minimize: (showDock?: boolean) => void;
  join: () => void;
  toggleMicrophone: () => void;
  toggleOutput: () => void;
  leave: () => Promise<void>;
};
