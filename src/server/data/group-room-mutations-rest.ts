import "server-only";

import { z } from "zod";

import { getAdminClient } from "@/lib/supabase/admin";
import type {
  GroupRoomCreateAndJoinResult,
  GroupRoomJoinResult,
  GroupRoomLeaveResult,
  GroupRoomRecord,
} from "@/types/group-room-mutations";

const roomSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  kind: z.enum(["lobby", "temporary", "pinned"]),
  name: z.string().min(1).max(80),
  createdBy: z.string().uuid().nullable(),
});

const joinSchema = z.object({
  roomId: z.string().uuid(),
  sessionId: z.string().uuid(),
  providerSessionId: z.string().uuid(),
  previousSessionId: z.string().uuid().nullable(),
  switched: z.boolean(),
});

const createAndJoinSchema = z.object({
  room: roomSchema,
  join: joinSchema,
});

const leaveSchema = z.object({
  left: z.boolean(),
  sessionId: z.string().uuid().nullable(),
  roomId: z.string().uuid().nullable(),
  sessionStatus: z.enum(["active", "grace", "ended"]).nullable(),
});

function throwRoomMutationError(message: string) {
  if (message.includes("ROOM_CONTEXT_CONFIRMATION_REQUIRED")) {
    throw new Error("Сначала подтвердите завершение текущего разговора");
  }
  if (message.includes("ROOM_NOT_EMPTY")) {
    throw new Error("Нельзя удалить комнату, пока в ней есть участники");
  }
  if (message.includes("ROOM_FORBIDDEN")) {
    throw new Error("Недостаточно прав для управления комнатой");
  }
  if (message.includes("ROOM_NOT_FOUND")) {
    throw new Error("Комната больше недоступна");
  }
  if (message.includes("ROOM_IDEMPOTENCY_CONFLICT")) {
    throw new Error("Запрос создания комнаты уже использован");
  }
  throw new Error(message);
}

async function roomRpc<T>(
  name: string,
  args: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const { data, error } = await getAdminClient().rpc(name, args);
  if (error) throwRoomMutationError(error.message);
  return schema.parse(data);
}

export async function getGroupRoomRecordRest(roomId: string): Promise<GroupRoomRecord> {
  const { data, error } = await getAdminClient()
    .from("group_rooms")
    .select("id, group_chat_id, kind, name, created_by")
    .eq("id", roomId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Комната больше недоступна");
  return roomSchema.parse({
    id: data.id,
    groupId: data.group_chat_id,
    kind: data.kind,
    name: data.name,
    createdBy: data.created_by,
  });
}

export function createGroupRoomRest(input: {
  groupId: string;
  userId: string;
  kind: "temporary" | "pinned";
  name: string;
}) {
  return roomRpc("create_group_room", {
    p_group_chat_id: input.groupId,
    p_user_id: input.userId,
    p_kind: input.kind,
    p_name: input.name,
  }, roomSchema);
}

export function createAndJoinGroupRoomRest(input: {
  groupId: string;
  userId: string;
  kind: "temporary" | "pinned";
  name: string;
  requestId: string;
  micMuted: boolean;
  allowCrossContext: boolean;
}): Promise<GroupRoomCreateAndJoinResult> {
  return roomRpc("create_and_join_group_room", {
    p_group_chat_id: input.groupId,
    p_user_id: input.userId,
    p_kind: input.kind,
    p_name: input.name,
    p_request_id: input.requestId,
    p_mic_muted: input.micMuted,
    p_allow_cross_context: input.allowCrossContext,
  }, createAndJoinSchema);
}

export function setGroupRoomKindRest(input: {
  roomId: string;
  userId: string;
  kind: "temporary" | "pinned";
}) {
  return roomRpc("set_group_room_kind", {
    p_room_id: input.roomId,
    p_user_id: input.userId,
    p_kind: input.kind,
  }, roomSchema);
}

export async function archiveGroupRoomRest(roomId: string, userId: string) {
  const { data, error } = await getAdminClient().rpc("archive_group_room", {
    p_room_id: roomId,
    p_user_id: userId,
  });
  if (error) throwRoomMutationError(error.message);
  if (data !== true) throw new Error("Не удалось удалить комнату");
  return { ok: true as const };
}

export function joinGroupRoomRest(input: {
  roomId: string;
  userId: string;
  micMuted: boolean;
  allowCrossContext: boolean;
}): Promise<GroupRoomJoinResult> {
  return roomRpc("join_group_room", {
    p_room_id: input.roomId,
    p_user_id: input.userId,
    p_mic_muted: input.micMuted,
    p_allow_cross_context: input.allowCrossContext,
  }, joinSchema);
}

export function leaveGroupRoomRest(input: {
  userId: string;
  sessionId: string | null;
}): Promise<GroupRoomLeaveResult> {
  return roomRpc("leave_live_session", {
    p_user_id: input.userId,
    p_session_id: input.sessionId,
  }, leaveSchema);
}

export async function heartbeatGroupRoomRest(input: {
  userId: string;
  sessionId: string;
  micMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
}) {
  const { data, error } = await getAdminClient().rpc("heartbeat_live_session", {
    p_user_id: input.userId,
    p_session_id: input.sessionId,
    p_mic_muted: input.micMuted,
    p_camera_enabled: input.cameraEnabled,
    p_screen_sharing: input.screenSharing,
  });
  if (error) throwRoomMutationError(error.message);
  if (data !== true) throw new Error("Вы больше не находитесь в комнате");
  return { ok: true as const };
}

export async function expireGroupRoomGraceRest(before?: string) {
  const { data, error } = await getAdminClient().rpc(
    "expire_group_room_grace",
    before ? { p_before: before } : {},
  );
  if (error) throwRoomMutationError(error.message);
  const expired = z.number().int().nonnegative().parse(data);
  return { expired };
}
