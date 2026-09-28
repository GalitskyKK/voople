import type { ChatMessageRoomContext } from "../../types/chat.ts";

export function messageRoomContextKey(
  context: ChatMessageRoomContext | null | undefined,
) {
  if (!context) return "conversation";
  const sourceId = context.liveSessionId ?? context.roomId ?? "archived";
  return `${sourceId}:${context.roomKind}:${context.roomName}`;
}
