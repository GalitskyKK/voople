import type { ChatRoomView } from "@/types/chat";
import type { GroupNowView } from "@/types/group-now";

export function buildCoreRoomVoiceView(
  groupNow: GroupNowView,
  input: { roomId: string; sessionId: string },
): ChatRoomView {
  const room = groupNow.rooms.find((candidate) => candidate.id === input.roomId);
  if (!room || room.joinTarget.kind !== "room") {
    throw new Error("Комната больше недоступна");
  }
  if (room.liveSessionId !== input.sessionId) {
    throw new Error("Сессия комнаты уже завершилась");
  }

  return {
    status: room.state === "grace" || room.state === "idle" ? "empty" : "active",
    accessMode: "open",
    startedBy: room.startedBy,
    startedAt: room.startedAt,
    endReason: null,
    participants: room.participants.map((participant) => ({
      id: participant.id,
      username: participant.username,
      displayName: participant.displayName,
      avatarUrl: participant.avatarUrl,
      avatarDecorationUrl: null,
      avatarRingId: null,
      micMuted: participant.micMuted ?? true,
      isMe: participant.isMe,
      ...(participant.guest ? { guest: true } : {}),
    })),
    isInside: groupNow.currentUserRoomId === room.id,
  };
}
