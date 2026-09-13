import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

import { getAdminClient } from "@/lib/supabase/admin";
import { loadGroupNowUsersRest } from "@/server/data/group-now-rest";
import type {
  RoomGuestConversionResult,
  RoomGuestInvitePreview,
  RoomGuestJoinResult,
} from "@/types/room-guests";

const ACTIVE_SESSION_STATES = ["connecting", "active", "grace"];
const INVITE_TTL_MS = 15 * 60_000;

const createInviteSchema = z.object({
  id: z.string().uuid(),
  expiresAt: z.string(),
  maxGuests: z.number().int().min(1).max(50),
});

const guestJoinSchema = z.object({
  guestId: z.string().uuid(),
  sessionId: z.string().uuid(),
  providerSessionId: z.string().uuid(),
  displayName: z.string().min(1).max(40),
  expiresAt: z.string(),
});

const guestConversionSchema = z.object({
  status: z.enum(["joined", "already_joined", "requested", "account_linked"]),
  groupId: z.string().uuid(),
  groupName: z.string().min(1),
});

const guestHeartbeatSchema = z.object({
  ok: z.literal(true),
  guestId: z.string().uuid(),
  usefulParticipation: z.boolean(),
});

const guestAudienceSchema = z.enum(["existing", "member"]);

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function guestAccessToken(inviteToken: string, requestId: string) {
  const secret = process.env.ROOM_GUEST_TOKEN_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Гостевой вход временно не настроен");
  return createHmac("sha256", secret)
    .update(`${inviteToken}:${requestId}`, "utf8")
    .digest("base64url");
}

function unavailable(
  reason: Exclude<RoomGuestInvitePreview["reason"], "active">,
): RoomGuestInvitePreview {
  return {
    available: false,
    reason,
    groupName: null,
    roomName: null,
    participantCount: 0,
    participants: [],
    expiresAt: null,
  };
}

export class RoomGuestUnavailableError extends Error {
  readonly reason: Exclude<RoomGuestInvitePreview["reason"], "active">;

  constructor(
    message: string,
    reason: Exclude<RoomGuestInvitePreview["reason"], "active">,
  ) {
    super(message);
    this.name = "RoomGuestUnavailableError";
    this.reason = reason;
  }
}

function roomGuestError(message: string) {
  if (message.includes("ROOM_GUEST_INVITE_MISSING")) {
    return new RoomGuestUnavailableError("Приглашение не найдено", "missing");
  }
  if (message.includes("ROOM_GUEST_INVITE_REVOKED")) {
    return new RoomGuestUnavailableError("Приглашение отозвано", "revoked");
  }
  if (message.includes("ROOM_GUEST_INVITE_EXPIRED")) {
    return new RoomGuestUnavailableError("Срок приглашения истёк", "expired");
  }
  if (message.includes("ROOM_GUEST_SESSION_ENDED")) {
    return new RoomGuestUnavailableError("Комната уже закрыта", "ended");
  }
  if (message.includes("ROOM_GUEST_CAPACITY_REACHED")) {
    return new RoomGuestUnavailableError(
      "В комнате больше нет гостевых мест",
      "full",
    );
  }
  if (message.includes("ROOM_GUEST_INVITE_FORBIDDEN")) {
    return new Error("Создать ссылку может только участник комнаты");
  }
  if (message.includes("ROOM_GUEST_INPUT_INVALID")) {
    return new Error("Проверьте имя гостя");
  }
  if (message.includes("ROOM_GUEST_IDEMPOTENCY_CONFLICT")) {
    return new Error("Попытка входа устарела. Повторите вход");
  }
  if (message.includes("ROOM_GUEST_CONVERSION_GROUP_FULL")) {
    return new Error("В группе больше нет свободных мест");
  }
  if (message.includes("ROOM_GUEST_CONVERSION_CLAIMED")) {
    return new Error("Гостевое место уже связано с другим аккаунтом");
  }
  if (message.includes("ROOM_GUEST_CONVERSION_USER_MISSING")) {
    return new Error("Сначала завершите создание профиля");
  }
  if (message.includes("ROOM_GUEST_CONVERSION")) {
    return new Error("Не удалось сохранить гостевое участие");
  }
  return new Error(message);
}

export async function createRoomGuestInviteRest(input: {
  sessionId: string;
  userId: string;
  maxGuests?: number;
}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { data, error } = await getAdminClient().rpc("create_room_guest_invite", {
    p_live_session_id: input.sessionId,
    p_user_id: input.userId,
    p_token_hash: tokenHash(token),
    p_expires_at: expiresAt,
    p_max_guests: input.maxGuests ?? 25,
  });
  if (error) throw roomGuestError(error.message);
  return { ...createInviteSchema.parse(data), token };
}

export async function previewRoomGuestInviteRest(
  token: string,
): Promise<RoomGuestInvitePreview> {
  const admin = getAdminClient();
  const inviteResult = await admin
    .from("room_guest_invites")
    .select("id, live_session_id, max_guests, expires_at, revoked_at")
    .eq("token_hash", tokenHash(token))
    .maybeSingle();
  if (inviteResult.error) throw new Error(inviteResult.error.message);
  const invite = inviteResult.data;
  if (!invite) return unavailable("missing");
  if (invite.revoked_at) return unavailable("revoked");
  if (new Date(invite.expires_at).getTime() <= Date.now()) return unavailable("expired");

  const sessionResult = await admin
    .from("live_sessions")
    .select("id, conversation_id, room_id, status, ended_at")
    .eq("id", invite.live_session_id)
    .eq("kind", "group_room")
    .maybeSingle();
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  const session = sessionResult.data;
  if (!session?.room_id || session.ended_at || !ACTIVE_SESSION_STATES.includes(String(session.status))) {
    return unavailable("ended");
  }

  const [roomResult, groupResult, memberResult, guestResult] = await Promise.all([
    admin.from("group_rooms").select("id, group_chat_id, name, archived_at")
      .eq("id", session.room_id).maybeSingle(),
    admin.from("chats").select("id, name, type, parent_chat_id")
      .eq("id", session.conversation_id).maybeSingle(),
    admin.from("live_session_participants").select("user_id")
      .eq("session_id", session.id).is("left_at", null),
    admin.from("live_session_guests").select("id, display_name")
      .eq("live_session_id", session.id).is("left_at", null)
      .is("converted_at", null)
      .gt("access_expires_at", new Date().toISOString())
      .gt("last_seen_at", new Date(Date.now() - 60_000).toISOString()),
  ]);
  if (roomResult.error) throw new Error(roomResult.error.message);
  if (groupResult.error) throw new Error(groupResult.error.message);
  if (memberResult.error) throw new Error(memberResult.error.message);
  if (guestResult.error) throw new Error(guestResult.error.message);
  const room = roomResult.data;
  const group = groupResult.data;
  if (!room || room.archived_at || room.group_chat_id !== session.conversation_id
    || !group || group.type !== "group" || group.parent_chat_id) return unavailable("ended");

  const userIds = (memberResult.data ?? []).map((row) => String(row.user_id));
  const users = await loadGroupNowUsersRest(userIds);
  const members = userIds.flatMap((userId) => {
    const user = users.get(userId);
    return user ? [{
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      guest: false,
    }] : [];
  });
  const guests = (guestResult.data ?? []).map((guest) => ({
    id: `guest:${guest.id}`,
    displayName: String(guest.display_name),
    avatarUrl: null,
    guest: true,
  }));
  const full = guests.length >= Number(invite.max_guests);
  return {
    available: !full,
    reason: full ? "full" : "active",
    groupName: String(group.name || "Группа"),
    roomName: String(room.name),
    participantCount: members.length + guests.length,
    participants: [...members, ...guests],
    expiresAt: String(invite.expires_at),
  };
}

export async function joinRoomAsGuestRest(input: {
  inviteToken: string;
  displayName: string;
  requestId: string;
}): Promise<RoomGuestJoinResult & { accessToken: string }> {
  const accessToken = guestAccessToken(input.inviteToken, input.requestId);
  const { data, error } = await getAdminClient().rpc("join_room_as_guest", {
    p_invite_token_hash: tokenHash(input.inviteToken),
    p_access_token_hash: tokenHash(accessToken),
    p_display_name: input.displayName,
    p_request_id: input.requestId,
  });
  if (error) throw roomGuestError(error.message);
  return { ...guestJoinSchema.parse(data), accessToken };
}

export async function resolveRoomGuestRest(accessToken: string) {
  const now = new Date().toISOString();
  const { data, error } = await getAdminClient()
    .from("live_session_guests")
    .select("id, live_session_id, display_name, access_expires_at, live_sessions!inner(provider_session_id, status, ended_at)")
    .eq("access_token_hash", tokenHash(accessToken))
    .is("left_at", null)
    .is("converted_at", null)
    .gt("access_expires_at", now)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Гостевая сессия недоступна");
  const session = Array.isArray(data.live_sessions) ? data.live_sessions[0] : data.live_sessions;
  if (!session || session.ended_at || !ACTIVE_SESSION_STATES.includes(String(session.status))) {
    throw new Error("Комната уже закрыта");
  }
  return {
    guestId: String(data.id),
    sessionId: String(data.live_session_id),
    providerSessionId: String(session.provider_session_id),
    displayName: String(data.display_name),
    expiresAt: String(data.access_expires_at),
  };
}

export async function heartbeatRoomGuestRest(accessToken: string, micMuted: boolean) {
  const { data, error } = await getAdminClient().rpc("heartbeat_room_guest_v2", {
    p_access_token_hash: tokenHash(accessToken),
    p_mic_muted: micMuted,
  });
  if (error) throw roomGuestError(error.message);
  const parsed = guestHeartbeatSchema.safeParse(data);
  if (!parsed.success) throw new Error("Гостевая сессия завершена");
  return parsed.data;
}

export async function roomGuestInviteAudienceRest(inviteToken: string, userId: string) {
  const { data, error } = await getAdminClient().rpc("room_guest_invite_audience", {
    p_invite_token_hash: tokenHash(inviteToken),
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return guestAudienceSchema.parse(data);
}

export async function leaveRoomGuestRest(accessToken: string) {
  const { data, error } = await getAdminClient().rpc("leave_room_guest", {
    p_access_token_hash: tokenHash(accessToken),
  });
  if (error) throw roomGuestError(error.message);
  return { left: data === true };
}

export async function convertRoomGuestAccountRest(input: {
  accessToken: string;
  userId: string;
}): Promise<RoomGuestConversionResult> {
  const { data, error } = await getAdminClient().rpc("convert_room_guest_account", {
    p_access_token_hash: tokenHash(input.accessToken),
    p_user_id: input.userId,
  });
  if (error) throw roomGuestError(error.message);
  return guestConversionSchema.parse(data);
}
