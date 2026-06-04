import {
  assertOwnedUploadKey,
  chatAttachmentKindFromKey,
  createPresignedGetUrl,
  isPrivateChatMediaKey,
  publicAssetUrl,
} from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { mapSubscriptionFields } from "@/server/mappers/profile";
import type { ChatMessageAttachment, ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

export type { ChatListItem, ChatMessageView } from "@/types/chat";

import type { ChatListItem } from "@/types/chat";

type DirectChatRpcResult = string | { get_or_create_direct_chat?: string } | null;

type MessageRow = {
  id: string;
  sender_id: string;
  text: string | null;
  media_url: string | null;
  media_title: string | null;
  media_artist: string | null;
  shared_track_id: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  read_at: string | null;
};

type TrackRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  file_url: string;
  duration_seconds: number | null;
};

function mapTrackRow(row: TrackRow): PlaylistTrackView {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    streamUrl: publicAssetUrl(row.file_url) ?? row.file_url,
    durationSeconds: row.duration_seconds,
  };
}

async function resolveMediaUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  if (isPrivateChatMediaKey(key)) {
    const { downloadUrl } = await createPresignedGetUrl({ key, bucket: "private" });
    return downloadUrl;
  }
  return publicAssetUrl(key);
}

function fileNameFromKey(key: string) {
  const segment = key.split("/").pop() ?? "audio";
  return segment.includes(".") ? segment : `${segment}.mp3`;
}

async function buildAttachment(
  row: MessageRow,
  tracksById: Map<string, TrackRow>,
): Promise<ChatMessageAttachment | null> {
  if (row.shared_track_id) {
    const track = tracksById.get(row.shared_track_id);
    if (!track) return null;
    return {
      kind: "track",
      track: mapTrackRow(track),
      ownerId: track.user_id,
    };
  }

  if (!row.media_url) return null;

  const url = await resolveMediaUrl(row.media_url);
  if (!url) return null;

  const kind = chatAttachmentKindFromKey(row.media_url);
  if (kind === "image") return { kind: "image", url };
  if (kind === "audio") {
    const fileName = fileNameFromKey(row.media_url);
    const fallbackTitle = fileName.replace(/\.[^.]+$/i, "") || "Аудио";
    return {
      kind: "audio",
      url,
      fileName,
      title: row.media_title?.trim() || fallbackTitle,
      artist: row.media_artist?.trim() || "Аудиосообщение",
    };
  }

  return null;
}

function mapMessageRow(
  row: MessageRow,
  viewerId: string,
  repliesById: Map<string, MessageRow>,
  tracksById: Map<string, TrackRow>,
  attachmentsById: Map<string, ChatMessageAttachment | null>,
): ChatMessageView {
  const replyRow = row.reply_to_message_id ? repliesById.get(row.reply_to_message_id) : undefined;

  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text ?? null,
    createdAt: row.created_at,
    isMine: row.sender_id === viewerId,
    readAt: row.read_at,
    replyTo: replyRow
      ? {
          id: replyRow.id,
          senderId: replyRow.sender_id,
          text: replyRow.text,
          isMine: replyRow.sender_id === viewerId,
        }
      : null,
    attachment: attachmentsById.get(row.id) ?? null,
  };
}

async function hydrateMessages(rows: MessageRow[], viewerId: string): Promise<ChatMessageView[]> {
  const repliesById = new Map(rows.map((row) => [row.id, row]));
  const trackIds = [...new Set(rows.map((r) => r.shared_track_id).filter(Boolean))] as string[];

  const tracksById = new Map<string, TrackRow>();
  if (trackIds.length > 0) {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("playlist_tracks")
      .select("id, user_id, title, artist, file_url, duration_seconds")
      .in("id", trackIds);

    if (error) throw new Error(error.message);
    for (const track of (data ?? []) as TrackRow[]) {
      tracksById.set(track.id, track);
    }
  }

  const attachmentsById = new Map<string, ChatMessageAttachment | null>();
  await Promise.all(
    rows.map(async (row) => {
      attachmentsById.set(row.id, await buildAttachment(row, tracksById));
    }),
  );

  return rows.map((row) => mapMessageRow(row, viewerId, repliesById, tracksById, attachmentsById));
}

async function assertMember(chatId: string, userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Нет доступа к чату");
}

async function assertReplyInChat(chatId: string, replyToMessageId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("messages")
    .select("id")
    .eq("id", replyToMessageId)
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Сообщение для ответа не найдено");
}

export async function getOrCreateDirectChatRest(myId: string, otherUserId: string) {
  if (myId === otherUserId) {
    throw new Error("Нельзя написать самому себе");
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_or_create_direct_chat", {
    p_current_user: myId,
    p_other_user: otherUserId,
  });

  if (error) throw new Error(error.message);

  const result = data as DirectChatRpcResult;
  const chatId = typeof result === "string" ? result : result?.get_or_create_direct_chat;

  if (!chatId) throw new Error("Не удалось открыть чат");
  return chatId;
}

export async function listChatsRest(userId: string): Promise<ChatListItem[]> {
  const admin = getAdminClient();

  const { data: memberships, error: memErr } = await admin
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", userId);

  if (memErr) throw new Error(memErr.message);
  if (!memberships?.length) return [];

  const chatIds = memberships.map((m) => m.chat_id as string);

  const [chatsResult, membersResult, msgsResult] = await Promise.all([
    admin.from("chats").select("id, type").in("id", chatIds),
    admin.from("chat_members").select("chat_id, user_id").in("chat_id", chatIds),
    admin
      .from("messages")
      .select("chat_id, text, created_at, sender_id")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(Math.min(chatIds.length * 5, 100)),
  ]);

  if (chatsResult.error) throw new Error(chatsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (msgsResult.error) throw new Error(msgsResult.error.message);

  const typeByChat = new Map<string, "direct" | "group">();
  for (const c of chatsResult.data ?? []) {
    typeByChat.set(c.id as string, (c.type as "direct" | "group") ?? "direct");
  }

  const otherUserIds = new Set<string>();
  const otherIdByChat = new Map<string, string>();
  for (const row of membersResult.data ?? []) {
    const uid = row.user_id as string;
    const cid = row.chat_id as string;
    if (uid === userId) continue;
    otherIdByChat.set(cid, uid);
    otherUserIds.add(uid);
  }

  const othersByChat = new Map<
    string,
    { id: string; username: string; displayName: string; hasVooplePlus: boolean }
  >();
  if (otherUserIds.size > 0) {
    const { data: users, error: usersErr } = await admin
      .from("users")
      .select("id, username, display_name, subscriptions (started_at, expires_at)")
      .in("id", [...otherUserIds]);

    if (usersErr) throw new Error(usersErr.message);

    const userById = new Map(
      (users ?? []).map((u) => {
        const subs = u.subscriptions as
          | { started_at: string; expires_at: string }
          | { started_at: string; expires_at: string }[]
          | null;
        const sub = Array.isArray(subs) ? subs[0] : subs;
        const { hasVooplePlus } = mapSubscriptionFields(sub ?? undefined);
        return [
          u.id as string,
          {
            id: u.id as string,
            username: u.username as string,
            displayName: u.display_name as string,
            hasVooplePlus,
          },
        ] as const;
      }),
    );

    for (const [cid, oid] of otherIdByChat) {
      const u = userById.get(oid);
      if (u) othersByChat.set(cid, u);
    }
  }

  const lastByChat = new Map<
    string,
    { text: string | null; createdAt: string; senderId: string }
  >();
  for (const m of msgsResult.data ?? []) {
    const cid = m.chat_id as string;
    if (!lastByChat.has(cid)) {
      lastByChat.set(cid, {
        text: (m.text as string | null) ?? null,
        createdAt: m.created_at as string,
        senderId: m.sender_id as string,
      });
    }
  }

  const items = chatIds.map((id) => {
    const last = lastByChat.get(id);
    const other = othersByChat.get(id);
    return {
      id,
      type: typeByChat.get(id) ?? "direct",
      otherUser: other ?? null,
      lastMessage: last
        ? {
            text: last.text,
            createdAt: last.createdAt,
            senderId: last.senderId,
          }
        : null,
    } satisfies ChatListItem;
  });

  items.sort((a, b) => {
    const ta = a.lastMessage?.createdAt ?? "";
    const tb = b.lastMessage?.createdAt ?? "";
    return tb.localeCompare(ta);
  });

  return items;
}

const MESSAGE_SELECT =
  "id, sender_id, text, media_url, media_title, media_artist, shared_track_id, reply_to_message_id, created_at, read_at";

export async function listMessagesRest(
  chatId: string,
  userId: string,
): Promise<{ messages: ChatMessageView[]; otherUser: ChatListItem["otherUser"] }> {
  await assertMember(chatId, userId);
  const admin = getAdminClient();

  const [msgResult, membersResult] = await Promise.all([
    admin
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(200),
    admin
      .from("chat_members")
      .select("user_id, users (id, username, display_name, subscriptions (started_at, expires_at))")
      .eq("chat_id", chatId),
  ]);

  if (msgResult.error) throw new Error(msgResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);

  let otherUser: ChatListItem["otherUser"] = null;
  for (const row of membersResult.data ?? []) {
    const uid = row.user_id as string;
    if (uid === userId) continue;
    const u = row.users as
      | {
          id: string;
          username: string;
          display_name: string;
          subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[];
        }
      | Array<{
          id: string;
          username: string;
          display_name: string;
          subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[];
        }>
      | null;
    const user = Array.isArray(u) ? u[0] : u;
    if (user) {
      const subs = user.subscriptions;
      const sub = Array.isArray(subs) ? subs[0] : subs;
      const { hasVooplePlus } = mapSubscriptionFields(sub ?? undefined);
      otherUser = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        hasVooplePlus,
      };
      break;
    }
  }

  const rows = (msgResult.data ?? []) as MessageRow[];
  const messages = await hydrateMessages(rows, userId);

  void markMessagesReadRest(chatId, userId);

  return { messages, otherUser };
}

export async function markMessagesReadRest(chatId: string, userId: string) {
  await assertMember(chatId, userId);
  const admin = getAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("messages")
    .update({ read_at: now })
    .eq("chat_id", chatId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return { readAt: now };
}

export type SendMessageInput = {
  chatId: string;
  senderId: string;
  messageId: string;
  text?: string;
  mediaKey?: string;
  mediaTitle?: string;
  mediaArtist?: string;
  sharedTrackId?: string;
  replyToMessageId?: string;
};

export async function sendMessageRest(input: SendMessageInput) {
  const trimmed = input.text?.trim() ?? "";
  const hasText = trimmed.length > 0;
  const hasMedia = Boolean(input.mediaKey);
  const hasTrack = Boolean(input.sharedTrackId);

  if (!hasText && !hasMedia && !hasTrack) {
    throw new Error("Добавьте текст или вложение");
  }
  if (trimmed.length > 1000) throw new Error("Максимум 1000 символов");

  await assertMember(input.chatId, input.senderId);

  if (input.replyToMessageId) {
    await assertReplyInChat(input.chatId, input.replyToMessageId);
  }

  if (input.mediaKey) {
    assertOwnedUploadKey(input.mediaKey, input.senderId, "chat");
    const mediaKind = chatAttachmentKindFromKey(input.mediaKey);
    if (mediaKind === "audio") {
      const title = input.mediaTitle?.trim() ?? "";
      const artist = input.mediaArtist?.trim() ?? "";
      if (!title || !artist) {
        throw new Error("Укажите название и исполнителя для аудио");
      }
      if (title.length > 100 || artist.length > 100) {
        throw new Error("Название и исполнитель — до 100 символов");
      }
    }
  }

  if (input.sharedTrackId) {
    const admin = getAdminClient();
    const { data: track, error } = await admin
      .from("playlist_tracks")
      .select("id")
      .eq("id", input.sharedTrackId)
      .eq("user_id", input.senderId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!track) throw new Error("Трек не найден в вашем плейлисте");
  }

  const admin = getAdminClient();
  const audioMeta =
    input.mediaKey && chatAttachmentKindFromKey(input.mediaKey) === "audio"
      ? {
          media_title: input.mediaTitle?.trim() ?? null,
          media_artist: input.mediaArtist?.trim() ?? null,
        }
      : { media_title: null, media_artist: null };

  const payload = {
    id: input.messageId,
    chat_id: input.chatId,
    sender_id: input.senderId,
    text: hasText ? trimmed : null,
    media_url: input.mediaKey ?? null,
    ...audioMeta,
    shared_track_id: input.sharedTrackId ?? null,
    reply_to_message_id: input.replyToMessageId ?? null,
  };

  const { data: row, error } = await admin
    .from("messages")
    .insert(payload)
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    if (error.code !== "23505") throw new Error(error.message);

    const { data: existing, error: existingErr } = await admin
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("id", input.messageId)
      .eq("chat_id", input.chatId)
      .maybeSingle();

    if (existingErr) throw new Error(existingErr.message);
    if (!existing) throw new Error("Не удалось подтвердить отправку сообщения");
    if (existing.sender_id !== input.senderId) throw new Error("ID сообщения уже занят");

    const [message] = await hydrateMessages([existing as MessageRow], input.senderId);
    return message;
  }

  const [message] = await hydrateMessages([row as MessageRow], input.senderId);
  return message;
}

export async function deleteMessageRest(messageId: string, userId: string) {
  const admin = getAdminClient();

  const { data: message, error: msgErr } = await admin
    .from("messages")
    .select("id, chat_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr) throw new Error(msgErr.message);
  if (!message) throw new Error("Сообщение не найдено");
  if ((message.sender_id as string) !== userId) {
    throw new Error("Можно удалить только свои сообщения");
  }

  await assertMember(message.chat_id as string, userId);

  const { error } = await admin.from("messages").delete().eq("id", messageId);
  if (error) throw new Error(error.message);

  return { id: messageId };
}

export async function getDirectChatByUsernameRest(myId: string, username: string) {
  const admin = getAdminClient();
  const { data: user, error } = await admin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("Пользователь не найден");

  const chatId = await getOrCreateDirectChatRest(myId, user.id as string);
  return { chatId };
}
