import type { CoreVoiceSessionDescriptor } from "@/types/voice";

import type { VoiceRoomMessagesModel } from "./voice-room-sheet-models";

export function resolveVoiceConversationId(
  current: CoreVoiceSessionDescriptor | undefined,
  targetGroupId: string,
) {
  return current?.groupId === targetGroupId
    ? current.conversationId ?? targetGroupId
    : targetGroupId;
}

export function buildVoiceRoomMessagesModel(
  session: CoreVoiceSessionDescriptor | undefined,
  inside: boolean,
): VoiceRoomMessagesModel | null {
  if (!session || !inside) return null;
  return {
    chatId: session.conversationId ?? session.groupId,
    groupId: session.groupId,
    roomId: session.room.id,
    liveSessionId: session.join.sessionId,
    roomName: session.room.name,
    roomKind: session.room.kind,
  };
}
