import type { GroupNowRoom } from "@/types/group-now";

export type GroupNowRoomAction = "join" | "switch" | "current";

export function resolveGroupNowRoomAction(
  roomId: string,
  currentUserRoomId: string | null,
): GroupNowRoomAction {
  if (roomId === currentUserRoomId) return "current";
  return currentUserRoomId ? "switch" : "join";
}

export function describeGroupNowRoom(room: GroupNowRoom) {
  const sharing = room.participants.find((participant) => participant.screenSharing);
  if (sharing) return `${sharing.displayName} показывает экран`;

  const openMic = room.participants.find((participant) => participant.micMuted === false);
  if (openMic) return `${openMic.displayName}: микрофон включён`;

  if (room.state === "connecting") return "Комната запускается";
  if (room.state === "grace") return "Разговор завершается";
  if (room.participantCount > 0) {
    return `${room.participantCount} ${pluralizePeople(room.participantCount)} в комнате`;
  }
  return room.kind === "lobby" ? "Лобби свободно" : "Сейчас тихо";
}

export function isGroupNowQuiet(rooms: readonly GroupNowRoom[]) {
  return rooms.every((room) => room.participantCount === 0);
}

export function formatGroupNowVoiceSummary(rooms: readonly GroupNowRoom[]) {
  const participantCount = rooms.reduce(
    (total, room) => total + room.participantCount,
    0,
  );
  const conversationCount = rooms.filter(
    (room) => room.participantCount > 0,
  ).length;

  return `${participantCount} в голосе · ${conversationCount} ${pluralizeConversations(conversationCount)}`;
}

export function formatGroupNowElapsed(startedAt: string | null, nowMs = Date.now()) {
  if (!startedAt) return null;
  const startedMs = Date.parse(startedAt);
  if (Number.isNaN(startedMs)) return null;
  const totalMinutes = Math.max(0, Math.floor((nowMs - startedMs) / 60_000));
  if (totalMinutes < 1) return "только что";
  if (totalMinutes < 60) return `${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

function pluralizePeople(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "человек";
  if (mod10 === 1) return "человек";
  if (mod10 >= 2 && mod10 <= 4) return "человека";
  return "человек";
}

function pluralizeConversations(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "разговоров";
  if (mod10 === 1) return "разговор";
  if (mod10 >= 2 && mod10 <= 4) return "разговора";
  return "разговоров";
}
