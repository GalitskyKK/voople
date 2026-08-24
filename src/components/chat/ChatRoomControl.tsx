"use client";

import { forwardRef } from "react";

import type {
  ChatRoomControlHandle,
  ChatRoomControlProps,
} from "./voice/chat-room-control-types";
import { ChatRoomControlView } from "./voice/ChatRoomControlView";
import { useChatRoomControl } from "./voice/useChatRoomControl";

/** Stable public boundary used by both web and desktop chat shells. */
export const ChatRoomControl = forwardRef<
  ChatRoomControlHandle,
  ChatRoomControlProps
>(function ChatRoomControl(props, ref) {
  const controller = useChatRoomControl(props, ref);
  return <ChatRoomControlView controller={controller} />;
});

export type { ChatRoomControlHandle } from "./voice/chat-room-control-types";
export type { VoiceControlState } from "./voice/voice-room-config";
