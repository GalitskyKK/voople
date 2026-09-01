import "server-only";

import { getChatMembershipRest } from "@/server/data/chat-access-rest";
import {
  archiveGroupRoomRest,
  createAndJoinGroupRoomRest,
  createGroupRoomRest,
  expireGroupRoomGraceRest,
  getGroupRoomRecordRest,
  heartbeatGroupRoomRest,
  joinGroupRoomRest,
  leaveGroupRoomRest,
  setGroupRoomKindRest,
} from "@/server/data/group-room-mutations-rest";
import {
  createGroupRoomMediaTokenRest,
  createGroupRoomScreenAudioTokenRest,
} from "@/server/data/chat-room-media-rest";

async function requireRootGroup(groupId: string, userId: string) {
  const membership = await getChatMembershipRest(groupId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Комнаты доступны только в основной группе");
  }
  return membership;
}

function requireRoomAdmin(role: "owner" | "admin" | "member") {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Управлять закреплёнными комнатами могут администраторы группы");
  }
}

export async function createGroupRoom(input: {
  groupId: string;
  userId: string;
  kind: "temporary" | "pinned";
  name: string;
}) {
  const membership = await requireRootGroup(input.groupId, input.userId);
  if (input.kind === "pinned") requireRoomAdmin(membership.role);
  const name = input.name.trim();
  if (!name || name.length > 80) throw new Error("Название комнаты должно содержать от 1 до 80 символов");
  return createGroupRoomRest({ ...input, name });
}

export async function createAndJoinGroupRoom(input: {
  groupId: string;
  userId: string;
  kind: "temporary" | "pinned";
  name: string;
  requestId: string;
  micMuted?: boolean;
  allowCrossContext?: boolean;
}) {
  const membership = await requireRootGroup(input.groupId, input.userId);
  if (input.kind === "pinned") requireRoomAdmin(membership.role);
  const name = input.name.trim();
  if (!name || name.length > 80) {
    throw new Error("Название комнаты должно содержать от 1 до 80 символов");
  }
  return createAndJoinGroupRoomRest({
    ...input,
    name,
    micMuted: input.micMuted ?? true,
    allowCrossContext: input.allowCrossContext ?? false,
  });
}

export async function setGroupRoomKind(input: {
  roomId: string;
  userId: string;
  kind: "temporary" | "pinned";
}) {
  const room = await getGroupRoomRecordRest(input.roomId);
  const membership = await requireRootGroup(room.groupId, input.userId);
  requireRoomAdmin(membership.role);
  return setGroupRoomKindRest(input);
}

export async function archiveGroupRoom(roomId: string, userId: string) {
  const room = await getGroupRoomRecordRest(roomId);
  const membership = await requireRootGroup(room.groupId, userId);
  const ownsTemporaryRoom = room.kind === "temporary" && room.createdBy === userId;
  if (!ownsTemporaryRoom) requireRoomAdmin(membership.role);
  return archiveGroupRoomRest(roomId, userId);
}

export async function joinGroupRoom(input: {
  roomId: string;
  userId: string;
  micMuted?: boolean;
  allowCrossContext?: boolean;
}) {
  const room = await getGroupRoomRecordRest(input.roomId);
  await requireRootGroup(room.groupId, input.userId);
  return joinGroupRoomRest({
    roomId: input.roomId,
    userId: input.userId,
    micMuted: input.micMuted ?? true,
    allowCrossContext: input.allowCrossContext ?? false,
  });
}

export const leaveGroupRoom = leaveGroupRoomRest;
export const heartbeatGroupRoom = heartbeatGroupRoomRest;
export const expireGroupRoomGrace = expireGroupRoomGraceRest;

export async function createGroupRoomMediaToken(
  sessionId: string,
  userId: string,
) {
  return createGroupRoomMediaTokenRest(sessionId, userId);
}

export async function createGroupRoomScreenAudioToken(
  sessionId: string,
  userId: string,
  screenSessionId: string,
) {
  return createGroupRoomScreenAudioTokenRest(sessionId, userId, screenSessionId);
}
