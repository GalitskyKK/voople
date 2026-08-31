import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getAdminClient } from "@/lib/supabase/admin";
import { getChatMembershipRest } from "@/server/data/chat-access-rest";
import {
  acceptGroupVanityInviteRest,
  previewGroupVanityInviteRest,
} from "@/server/data/chat-vanity-invites-rest";
import {
  loadGroupCommunitySummariesRest,
} from "@/server/data/chat-community-rest";
import { loadInviteActivityCountsRest } from "@/server/data/chat-invite-activity-rest";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";
import type {
  ChatInvitePreview,
  ChatRoomView,
} from "@/types/chat";

const ROOM_STALE_AFTER_MS = 3 * 60_000;
export const DIRECT_CALL_RING_MS = 45_000;

function roomEndReason(status: string | null | undefined): ChatRoomView["endReason"] {
  return status === "declined" ||
    status === "cancelled" ||
    status === "missed" ||
    status === "ended"
    ? status
    : null;
}

function utcTimestampMs(value: string | null | undefined) {
  if (!value) return 0;
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? value
    : `${value}Z`;
  return Date.parse(normalized);
}

type RoomTimelineEvent = "started" | "ended" | "missed" | "declined" | "cancelled";

function roomTimelineMessageId(chatId: string, startedAt: string, event: RoomTimelineEvent) {
  const hex = createHash("sha256").update(`${chatId}:${startedAt}:${event}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export async function insertRoomTimelineEventRest(input: {
  chatId: string;
  startedBy: string;
  startedAt: string;
  event: RoomTimelineEvent;
  roomKind?: "direct" | "group";
}) {
  const durationSeconds = input.event === "ended"
    ? Math.max(0, Math.round((Date.now() - utcTimestampMs(input.startedAt)) / 1000))
    : null;
  const text = input.event === "started"
    ? input.roomKind === "group" ? "Комната открыта" : "Начат звонок"
    : input.event === "ended"
      ? `Встреча завершена · ${durationSeconds ?? 0} сек.`
      : input.event === "missed"
        ? "Пропущенный звонок"
        : input.event === "declined"
          ? "Звонок отклонён"
          : "Звонок отменён";
  const { error } = await getAdminClient().from("messages").upsert({
    id: roomTimelineMessageId(input.chatId, input.startedAt, input.event),
    chat_id: input.chatId,
    sender_id: input.startedBy,
    text,
    content: [{ type: "roomEvent", event: input.event, durationSeconds, roomKind: input.roomKind }],
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}


function hashInviteToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function getMembership(chatId: string, userId: string) {
  return getChatMembershipRest(chatId, userId);
}

export async function createChatInviteRest(chatId: string, userId: string) {
  const membership = await getMembership(chatId, userId);
  if (membership.type !== "group") {
    throw new Error("Ссылки-приглашения доступны только для групп");
  }
  if (membership.parentChatId) {
    throw new Error("Приглашение создаётся для основной группы, а не подчатов");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Создавать ссылки могут владелец и администраторы группы");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  const admin = getAdminClient();

  const { error } = await admin.from("chat_invites").insert({
    chat_id: chatId,
    created_by: userId,
    token_hash: tokenHash,
    expires_at: null,
    max_uses: null,
  });
  if (error) throw new Error(error.message);

  return { token, expiresAt: null };
}

export async function revokeChatInviteRest(chatId: string, userId: string, token: string) {
  const membership = await getMembership(chatId, userId);
  if (membership.type !== "group") {
    throw new Error("Ссылки-приглашения доступны только для групп");
  }
  if (membership.parentChatId) {
    throw new Error("Приглашение отзывается в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Отзывать ссылки могут владелец и администраторы группы");
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("token_hash", hashInviteToken(token))
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ссылка уже отозвана или не найдена");
  return { ok: true as const };
}

export async function previewChatInviteRest(token: string): Promise<ChatInvitePreview> {
  const tokenHash = hashInviteToken(token);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_invites")
    .select("chat_id, expires_at, max_uses, use_count, revoked_at, chats!inner(type, name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const vanityPreview = await previewGroupVanityInviteRest(token);
    if (vanityPreview) return vanityPreview;
    return {
      available: false,
      reason: "missing",
      chatId: null,
      chatName: null,
      groupIcon: null,
      groupAvatarUrl: null,
      groupBannerUrl: null,
      groupTag: null,
      groupAccentColor: null,
      memberCount: 0,
      onlineCount: 0,
      roomParticipantCount: 0,
      expiresAt: null,
    };
  }

  const chat = Array.isArray(data.chats) ? data.chats[0] : data.chats;
  const [{ count, error: countError }, communities, activity] = await Promise.all([
    admin
      .from("chat_members")
      .select("user_id", { count: "exact", head: true })
      .eq("chat_id", data.chat_id),
    loadGroupCommunitySummariesRest([data.chat_id], ""),
    loadInviteActivityCountsRest(data.chat_id),
  ]);
  if (countError) throw new Error(countError.message);
  const community = communities.get(data.chat_id);

  const isExpired = Boolean(data.expires_at && new Date(data.expires_at).getTime() <= Date.now());
  const reason = data.revoked_at
    ? "revoked"
    : isExpired
      ? "expired"
      : data.max_uses !== null && data.use_count >= data.max_uses
        ? "used"
        : "active";

  return {
    available: reason === "active" && chat?.type === "group",
    reason,
    chatId: data.chat_id,
    chatName: typeof chat?.name === "string" ? chat.name : "Группа",
    groupIcon: community?.icon ?? null,
    groupAvatarUrl: community?.avatarUrl ?? null,
    groupBannerUrl: community?.effectiveBannerUrl ?? null,
    groupTag: community?.effectiveTag ?? null,
    groupAccentColor: community?.effectiveAccentColor ?? null,
    memberCount: count ?? 0,
    onlineCount: activity.onlineCount,
    roomParticipantCount: activity.roomParticipantCount,
    expiresAt: data.expires_at,
  };
}

export async function acceptChatInviteRest(token: string, userId: string) {
  const vanityResult = await acceptGroupVanityInviteRest(token, userId);
  if (vanityResult) return vanityResult;
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("accept_chat_invite", {
    p_token_hash: hashInviteToken(token),
    p_user_id: userId,
  });

  if (error) {
    if (error.message.includes("Group is full")) throw new Error("В группе уже 20 участников");
    throw new Error("Ссылка больше не действует");
  }
  if (typeof data !== "string") throw new Error("Не удалось вступить в группу");
  return { chatId: data };
}

async function removeStaleRoomParticipants(chatId: string) {
  const admin = getAdminClient();
  const staleBefore = new Date(Date.now() - ROOM_STALE_AFTER_MS).toISOString();
  const { error } = await admin
    .from("chat_room_participants")
    .delete()
    .eq("chat_id", chatId)
    .lt("last_seen_at", staleBefore);
  if (error && error.code !== "42P01") throw new Error(error.message);
}

async function assertNoOtherActiveRoom(chatId: string, userId: string) {
  const admin = getAdminClient();
  const staleBefore = new Date(Date.now() - ROOM_STALE_AFTER_MS).toISOString();
  const { error: cleanupError } = await admin
    .from("chat_room_participants")
    .delete()
    .eq("user_id", userId)
    .lt("last_seen_at", staleBefore);
  if (cleanupError && cleanupError.code !== "42P01") {
    throw new Error(cleanupError.message);
  }

  const { data, error } = await admin
    .from("chat_room_participants")
    .select("chat_id")
    .eq("user_id", userId)
    .neq("chat_id", chatId)
    .limit(1);
  if (error && error.code !== "42P01") throw new Error(error.message);
  if (data?.length) {
    throw new Error("Сначала завершите текущий разговор");
  }

  const { data: liveParticipant, error: liveParticipantError } = await admin
    .from("live_session_participants")
    .select("session_id")
    .eq("user_id", userId)
    .is("left_at", null)
    .limit(1);
  if (liveParticipantError && liveParticipantError.code !== "42P01") {
    throw new Error(liveParticipantError.message);
  }
  if (liveParticipant?.length) {
    throw new Error("Сначала завершите текущий разговор");
  }
}

async function finishRoom(
  chatId: string,
  status: NonNullable<ChatRoomView["endReason"]>,
  roomKind: "direct" | "group",
) {
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const { data: room, error: readError } = await admin
    .from("chat_rooms")
    .select("status, started_by, started_at")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!room || !["active", "ringing"].includes(room.status as string)) return;
  const { data: updated, error: roomError } = await admin
    .from("chat_rooms")
    .update({ status, ended_at: now, updated_at: now })
    .eq("chat_id", chatId)
    .eq("status", room.status)
    .select("chat_id")
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!updated) return;

  const { error: participantsError } = await admin
    .from("chat_room_participants")
    .delete()
    .eq("chat_id", chatId);
  if (participantsError) throw new Error(participantsError.message);
  await insertRoomTimelineEventRest({
    chatId,
    startedBy: room.started_by as string,
    startedAt: room.started_at as string,
    event: status,
    roomKind,
  });
}

export async function getChatRoomRest(chatId: string, userId: string): Promise<ChatRoomView> {
  const membership = await getMembership(chatId, userId);
  await removeStaleRoomParticipants(chatId);

  const admin = getAdminClient();
  const [roomResult, participantsResult] = await Promise.all([
    admin
      .from("chat_rooms")
      .select("status, access_mode, started_by, started_at")
      .eq("chat_id", chatId)
      .maybeSingle(),
    admin
      .from("chat_room_participants")
      .select("user_id, mic_muted, users!inner(id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id))")
      .eq("chat_id", chatId)
      .order("joined_at", { ascending: true }),
  ]);

  if (roomResult.error && roomResult.error.code !== "42P01") {
    throw new Error(roomResult.error.message);
  }
  if (participantsResult.error && participantsResult.error.code !== "42P01") {
    throw new Error(participantsResult.error.message);
  }

  const participantRows = participantsResult.data ?? [];
  const storedStatus = roomResult.data?.status as string | undefined;
  const ringExpired =
    storedStatus === "ringing" &&
    Date.now() - utcTimestampMs(roomResult.data?.started_at) >
      DIRECT_CALL_RING_MS;
  if (ringExpired) {
    await finishRoom(chatId, "missed", membership.type);
    participantRows.length = 0;
  }

  const active = storedStatus === "active" && participantRows.length > 0;
  const ringing =
    storedStatus === "ringing" && !ringExpired && participantRows.length > 0;

  if (!active && storedStatus === "active") {
    await finishRoom(chatId, "ended", membership.type);
  }

  const participants = participantRows.flatMap((row) => {
    const related = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!related) return [];
    const customizationRelation = related.profile_customization as
      | CustomizationRow
      | CustomizationRow[]
      | null;
    const customization = toProfileCustomizationView(
      Array.isArray(customizationRelation)
        ? customizationRelation[0]
        : customizationRelation,
    );
    return [{
      id: related.id as string,
      username: related.username as string,
      displayName: related.display_name as string,
      avatarUrl: customization.assets.animatedAvatarUrl ?? null,
      avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
      avatarRingId: customization.avatarRingId ?? null,
      micMuted: Boolean(row.mic_muted),
      isMe: row.user_id === userId,
    }];
  });

  return {
    status: active ? "active" : ringing ? "ringing" : "empty",
    accessMode: roomResult.data?.access_mode === "locked" ? "locked" : "open",
    startedBy: active || ringing ? roomResult.data?.started_by ?? null : null,
    startedAt: active || ringing ? roomResult.data?.started_at ?? null : null,
    endReason: active || ringing ? null : ringExpired ? "missed" : roomEndReason(storedStatus),
    participants,
    isInside: participants.some((participant) => participant.id === userId),
  };
}

export async function enterChatRoomRest(chatId: string, userId: string, micMuted: boolean) {
  const membership = await getMembership(chatId, userId);
  await assertNoOtherActiveRoom(chatId, userId);
  const current = await getChatRoomRest(chatId, userId);
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const startsNewRoom = current.status === "empty";

  if (current.status === "active" && current.accessMode === "locked" && !current.isInside) {
    throw new Error("Комната закрыта. Запрос на вход появится на следующем этапе");
  }

  if (current.status === "empty") {
    const { error } = await admin.from("chat_rooms").upsert({
      chat_id: chatId,
      status: membership.type === "direct" ? "ringing" : "active",
      access_mode: "open",
      started_by: userId,
      started_at: now,
      ended_at: null,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  } else if (
    current.status === "ringing" &&
    membership.type === "direct" &&
    current.startedBy !== userId
  ) {
    const { data, error } = await admin
      .from("chat_rooms")
      .update({ status: "active", started_at: now, updated_at: now })
      .eq("chat_id", chatId)
      .eq("status", "ringing")
      .select("chat_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Звонок уже завершён");
  }

  const { error } = await admin.from("chat_room_participants").upsert({
    chat_id: chatId,
    user_id: userId,
    mic_muted: micMuted,
    joined_at: now,
    last_seen_at: now,
  });
  if (error) throw new Error(error.message);

  if (startsNewRoom) {
    await insertRoomTimelineEventRest({
      chatId,
      startedBy: userId,
      startedAt: now,
      event: "started",
      roomKind: membership.type,
    });
  }

  return getChatRoomRest(chatId, userId);
}

export async function heartbeatChatRoomRest(chatId: string, userId: string, micMuted: boolean) {
  await getMembership(chatId, userId);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_room_participants")
    .update({ last_seen_at: new Date().toISOString(), mic_muted: micMuted })
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Вы больше не находитесь в комнате");
  return { ok: true as const };
}

export async function leaveChatRoomRest(chatId: string, userId: string) {
  const membership = await getMembership(chatId, userId);
  const admin = getAdminClient();
  const { data: room, error: roomError } = await admin
    .from("chat_rooms")
    .select("status, started_by")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);

  if (membership.type === "direct") {
    await finishRoom(
      chatId,
      room?.status === "ringing" && room.started_by === userId
        ? "cancelled"
        : "ended",
      membership.type,
    );
    return { ok: true as const };
  }

  const { error } = await admin
    .from("chat_room_participants")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  await removeStaleRoomParticipants(chatId);
  const { count, error: countError } = await admin
    .from("chat_room_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("chat_id", chatId);
  if (countError) throw new Error(countError.message);

  if (!count) {
    await finishRoom(chatId, "ended", membership.type);
  }

  return { ok: true as const };
}

export async function setChatRoomAccessRest(
  chatId: string,
  userId: string,
  accessMode: "open" | "locked",
) {
  const membership = await getMembership(chatId, userId);
  const admin = getAdminClient();
  const { data: room, error: roomError } = await admin
    .from("chat_rooms")
    .select("started_by, status")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!room || room.status !== "active") throw new Error("Комната не запущена");
  if (
    room.started_by !== userId &&
    membership.role !== "owner" &&
    membership.role !== "admin"
  ) {
    throw new Error("Изменить доступ может ведущий или администратор группы");
  }

  const { error } = await admin
    .from("chat_rooms")
    .update({ access_mode: accessMode, updated_at: new Date().toISOString() })
    .eq("chat_id", chatId);
  if (error) throw new Error(error.message);
  return { accessMode };
}
