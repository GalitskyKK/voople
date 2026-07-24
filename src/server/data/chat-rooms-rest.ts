import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";

import { getAdminClient } from "@/lib/supabase/admin";
import type { ChatInvitePreview, ChatRoomView } from "@/types/chat";

const ROOM_STALE_AFTER_MS = 90_000;
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

function hashInviteToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function getMembership(chatId: string, userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_members")
    .select("role, chats!inner(type, name)")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Нет доступа к этой беседе");

  const relatedChat = Array.isArray(data.chats) ? data.chats[0] : data.chats;
  if (!relatedChat || (relatedChat.type !== "group" && relatedChat.type !== "direct")) {
    throw new Error("Беседа недоступна");
  }

  return {
    role: data.role === "owner" || data.role === "admin" ? data.role : "member",
    type: relatedChat.type,
    name: typeof relatedChat.name === "string" ? relatedChat.name : null,
  } as const;
}

export async function createChatInviteRest(chatId: string, userId: string) {
  const membership = await getMembership(chatId, userId);
  if (membership.type !== "group") {
    throw new Error("Ссылки-приглашения доступны только для групп");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Создавать ссылки могут владелец и администраторы группы");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString();
  const admin = getAdminClient();

  const { error } = await admin.from("chat_invites").insert({
    chat_id: chatId,
    created_by: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    max_uses: 20,
  });
  if (error) throw new Error(error.message);

  return { token, expiresAt };
}

export async function revokeChatInviteRest(chatId: string, userId: string, token: string) {
  const membership = await getMembership(chatId, userId);
  if (membership.type !== "group") {
    throw new Error("Ссылки-приглашения доступны только для групп");
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
    return {
      available: false,
      reason: "missing",
      chatId: null,
      chatName: null,
      memberCount: 0,
      expiresAt: null,
    };
  }

  const chat = Array.isArray(data.chats) ? data.chats[0] : data.chats;
  const { count, error: countError } = await admin
    .from("chat_members")
    .select("user_id", { count: "exact", head: true })
    .eq("chat_id", data.chat_id);
  if (countError) throw new Error(countError.message);

  const isExpired = new Date(data.expires_at).getTime() <= Date.now();
  const reason = data.revoked_at
    ? "revoked"
    : isExpired
      ? "expired"
      : data.use_count >= data.max_uses
        ? "used"
        : "active";

  return {
    available: reason === "active" && chat?.type === "group",
    reason,
    chatId: data.chat_id,
    chatName: typeof chat?.name === "string" ? chat.name : "Группа",
    memberCount: count ?? 0,
    expiresAt: data.expires_at,
  };
}

export async function acceptChatInviteRest(token: string, userId: string) {
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

export async function getChatRoomRest(chatId: string, userId: string): Promise<ChatRoomView> {
  await getMembership(chatId, userId);
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
      .select("user_id, mic_muted, users!inner(id, username, display_name)")
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
  const active = roomResult.data?.status === "active" && participantRows.length > 0;

  if (!active && roomResult.data?.status === "active") {
    await admin
      .from("chat_rooms")
      .update({ status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("chat_id", chatId);
  }

  const participants = participantRows.flatMap((row) => {
    const related = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!related) return [];
    return [{
      id: related.id as string,
      username: related.username as string,
      displayName: related.display_name as string,
      micMuted: Boolean(row.mic_muted),
      isMe: row.user_id === userId,
    }];
  });

  return {
    status: active ? "active" : "empty",
    accessMode: roomResult.data?.access_mode === "locked" ? "locked" : "open",
    startedBy: active ? roomResult.data?.started_by ?? null : null,
    startedAt: active ? roomResult.data?.started_at ?? null : null,
    participants,
    isInside: participants.some((participant) => participant.id === userId),
  };
}

export async function enterChatRoomRest(chatId: string, userId: string, micMuted: boolean) {
  await getMembership(chatId, userId);
  const current = await getChatRoomRest(chatId, userId);
  const admin = getAdminClient();
  const now = new Date().toISOString();

  if (current.status === "active" && current.accessMode === "locked" && !current.isInside) {
    throw new Error("Комната закрыта. Запрос на вход появится на следующем этапе");
  }

  if (current.status === "empty") {
    const { error } = await admin.from("chat_rooms").upsert({
      chat_id: chatId,
      status: "active",
      access_mode: "open",
      started_by: userId,
      started_at: now,
      ended_at: null,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  }

  const { error } = await admin.from("chat_room_participants").upsert({
    chat_id: chatId,
    user_id: userId,
    mic_muted: micMuted,
    joined_at: now,
    last_seen_at: now,
  });
  if (error) throw new Error(error.message);

  return getChatRoomRest(chatId, userId);
}

export async function createChatRoomMediaTokenRest(chatId: string, userId: string) {
  await getMembership(chatId, userId);

  const url = (
    process.env.NEXT_PUBLIC_LIVEKIT_URL ??
    process.env.LIVEKIT_URL
  )?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) {
    return { enabled: false as const };
  }

  const admin = getAdminClient();
  const [{ data: participant, error: participantError }, { data: user, error: userError }] =
    await Promise.all([
      admin
        .from("chat_room_participants")
        .select("user_id")
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("users")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (participantError) throw new Error(participantError.message);
  if (!participant) throw new Error("Сначала войдите в комнату");
  if (userError) throw new Error(userError.message);

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: user?.display_name ?? "Участник",
    ttl: "15m",
  });
  token.addGrant({
    roomJoin: true,
    room: `chat-${chatId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return {
    enabled: true as const,
    url,
    token: await token.toJwt(),
  };
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
  await getMembership(chatId, userId);
  const admin = getAdminClient();
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
    await admin
      .from("chat_rooms")
      .update({ status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("chat_id", chatId);
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
