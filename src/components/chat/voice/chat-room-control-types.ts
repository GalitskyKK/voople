import type {
  CoreVoiceSessionDescriptor,
  EnabledVoiceMediaCredentials,
} from "@/types/voice";

import type { VoiceControlState } from "./voice-room-config";

export type ChatRoomControlProps = {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  renderTrigger?: boolean;
  initialOpen?: boolean;
  onStateChange?: (state: VoiceControlState) => void;
  coreSession?: CoreVoiceSessionDescriptor;
  initialCoreCredentials?: EnabledVoiceMediaCredentials;
};

export type ChatRoomControlHandle = {
  open: () => void;
  join: () => void;
  toggleMicrophone: () => void;
  toggleOutput: () => void;
  leave: () => void;
};
