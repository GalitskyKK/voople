import {
  assertOwnedUploadKey,
  chatAudioKindFromKey,
  chatAttachmentKindFromKey,
  createPresignedGetUrl,
  isPrivateChatMediaKey,
  publicAssetUrl,
} from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";
import { mapSubscriptionFields } from "@/server/mappers/profile";
import type {
  ChatMessageAttachment,
  ChatMessageView,
  ChatThreadSummary,
} from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { loadGroupCommunitySummariesRest } from "@/server/data/chat-community-rest";
import { loadMessageReactionsRest } from "@/server/data/chat-reactions-rest";
import { getOrCreateDirectChatRest } from "@/server/data/chat-management-rest";

export {
  addGroupMembersRest,
  createGroupChatRest,
  createSubchatRest,
} from "@/server/data/chat-management-rest";
export { getOrCreateDirectChatRest };
export { deleteMessageRest, toggleMessageReactionRest } from "@/server/data/chat-message-actions-rest";

export type { ChatListItem, ChatMessageView } from "@/types/chat";

import type { ChatListItem } from "@/types/chat";

function compactAvatarFields(
  related: CustomizationRow | CustomizationRow[] | null | undefined,
) {
  const customization = toProfileCustomizationView(
    Array.isArray(related) ? related[0] : related,
  );
  return {
    avatarUrl: customization.assets.animatedAvatarUrl ?? null,
    avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
    avatarRingId: customization.avatarRingId ?? null,
  };
}

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
  if (kind === "circle") return { kind: "circle", url };
  if (kind === "audio") {
    const fileName = fileNameFromKey(row.media_url);
    const fallbackTitle = fileName.replace(/\.[^.]+$/i, "") || "Аудио";
    const audioKind = chatAudioKindFromKey(row.media_url) === "voice" || row.media_title === "Голосовое сообщение"
      ? "voice"
      : "music";
    return {
      kind: "audio",
      audioKind,
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
    reactions: [],
  };
}

async function hydrateMessages(rows: MessageRow[], viewerId: string): Promise<ChatMessageView[]> {
  const repliesById = new Map(rows.map((row) => [row.id, row]));
  const trackIds = [...new Set(rows.map((r) => r.shared_track_id).filter(Boolean))] as string[];
  const reactionsPromise = loadMessageReactionsRest(
    rows.map((row) => row.id),
    viewerId,
  );

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

  const reactionsByMessage = await reactionsPromise;

  return rows.map((row) => ({
    ...mapMessageRow(row, viewerId, repliesById, tracksById, attachmentsById),
    reactions: reactionsByMessage.get(row.id) ?? [],
  }));
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

export async function listChatsRest(userId: string): Promise<ChatListItem[]> {
  const admin = getAdminClient();

  const { data: memberships, error: memErr } = await admin
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", userId);

  if (memErr) throw new Error(memErr.message);
  if (!memberships?.length) return [];

  const chatIds = memberships.map((m) => m.chat_id as string);

  const [chatsResult, membersResult, channelsResult] = await Promise.all([
    admin.from("chats").select("id, type, name, parent_chat_id, topics_enabled, topics_layout, topic_icon, group_visibility, section_access_mode").in("id", chatIds),
    admin.from("chat_members").select("chat_id, user_id, role").in("chat_id", chatIds),
    admin
      .from("chats")
      .select("id, type, name, parent_chat_id, topics_enabled, topics_layout, topic_icon, group_visibility, section_access_mode")
      .in("parent_chat_id", chatIds),
  ]);

  if (chatsResult.error) throw new Error(chatsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (channelsResult.error) throw new Error(channelsResult.error.message);

  const channelRows = channelsResult.data ?? [];
  const channelIds = channelRows.map((channel) => channel.id as string);
  const allChatIds = [...chatIds, ...channelIds];
  const msgsResult = await admin
    .from("messages")
    .select("chat_id, text, created_at, sender_id")
    .in("chat_id", allChatIds)
    .order("created_at", { ascending: false })
    .limit(Math.min(allChatIds.length * 5, 300));
  if (msgsResult.error) throw new Error(msgsResult.error.message);
  const typeByChat = new Map<string, "direct" | "group">();
  const nameByChat = new Map<string, string | null>();
  const parentByChat = new Map<string, string>();
  const topicsEnabledByChat = new Map<string, boolean>();
  const topicsLayoutByChat = new Map<string, "tabs" | "list">();
  const topicIconByChat = new Map<string, string | null>();
  const groupVisibilityByChat = new Map<string, "private" | "public">();
  const sectionAccessByChat = new Map<string, "inherit" | "restricted">();
  for (const c of [...(chatsResult.data ?? []), ...channelRows]) {
    typeByChat.set(c.id as string, (c.type as "direct" | "group") ?? "direct");
    nameByChat.set(c.id as string, (c.name as string | null) ?? null);
    topicsEnabledByChat.set(c.id as string, Boolean(c.topics_enabled));
    topicsLayoutByChat.set(c.id as string, c.topics_layout === "tabs" ? "tabs" : "list");
    topicIconByChat.set(c.id as string, (c.topic_icon as string | null) ?? null);
    groupVisibilityByChat.set(c.id as string, c.group_visibility === "public" ? "public" : "private");
    sectionAccessByChat.set(c.id as string, c.section_access_mode === "restricted" ? "restricted" : "inherit");
    if (c.parent_chat_id) {
      parentByChat.set(c.id as string, c.parent_chat_id as string);
    }
  }
  const communityByChat = await loadGroupCommunitySummariesRest(
    chatIds.filter((id) => typeByChat.get(id) === "group"),
    userId,
  );
  const otherUserIds = new Set<string>();
  const otherIdByChat = new Map<string, string>();
  const memberCountByChat = new Map<string, number>();
  const viewerRoleByChat = new Map<string, "owner" | "admin" | "member">();
  for (const row of membersResult.data ?? []) {
    const uid = row.user_id as string;
    const cid = row.chat_id as string;
    memberCountByChat.set(cid, (memberCountByChat.get(cid) ?? 0) + 1);
    if (uid === userId) {
      viewerRoleByChat.set(
        cid,
        row.role === "owner" || row.role === "admin" ? row.role : "member",
      );
    }
    if (uid === userId) continue;
    if (typeByChat.get(cid) === "group") continue;
    otherIdByChat.set(cid, uid);
    otherUserIds.add(uid);
  }
  const { data: sectionMemberships, error: sectionMembershipError } = channelIds.length
    ? await admin
        .from("chat_section_members")
        .select("chat_id")
        .eq("user_id", userId)
        .in("chat_id", channelIds)
    : { data: [], error: null };
  if (sectionMembershipError) throw new Error(sectionMembershipError.message);
  const allowedRestrictedSectionIds = new Set(
    (sectionMemberships ?? []).map((row) => row.chat_id as string),
  );

  const othersByChat = new Map<
    string,
    NonNullable<ChatListItem["otherUser"]>
  >();
  if (otherUserIds.size > 0) {
    const { data: users, error: usersErr } = await admin
      .from("users")
      .select("id, username, display_name, last_seen_at, show_online_status, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id)")
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
            lastSeenAt: u.show_online_status === false ? null : (u.last_seen_at as string | null),
            ...compactAvatarFields(
              u.profile_customization as
                | CustomizationRow
                | CustomizationRow[]
                | null,
            ),
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

  const createItem = (id: string, parentChatId: string | null): ChatListItem => {
    const last = lastByChat.get(id);
    const other = othersByChat.get(id);
    const accessChatId = parentChatId ?? id;
    const community = communityByChat.get(accessChatId);
    return {
      id,
      type: typeByChat.get(id) ?? "direct",
      name: nameByChat.get(id) ?? null,
      parentChatId,
      topicsEnabled: topicsEnabledByChat.get(id) ?? false,
      topicsLayout: topicsLayoutByChat.get(id) ?? "list",
      topicIcon: topicIconByChat.get(id) ?? null,
      groupVisibility: groupVisibilityByChat.get(id) ?? "private",
      sectionAccessMode: sectionAccessByChat.get(id) ?? "inherit",
      groupIcon: community?.icon ?? null,
      groupAvatarUrl: community?.avatarUrl ?? null,
      groupAccentColor: community?.effectiveAccentColor ?? null,
      boostCount: community?.boostCount ?? 0,
      boostedByMe: community?.boostedByMe ?? false,
      memberCount: memberCountByChat.get(accessChatId) ?? 0,
      viewerRole: viewerRoleByChat.get(accessChatId) ?? "member",
      otherUser: other ?? null,
      lastMessage: last
        ? {
            text: last.text,
            createdAt: last.createdAt,
            senderId: last.senderId,
          }
        : null,
      channels: [],
    };
  };

  const channelsByParent = new Map<string, ChatListItem[]>();
  for (const id of channelIds) {
    const parentChatId = parentByChat.get(id);
    if (!parentChatId) continue;
    const rootRole = viewerRoleByChat.get(parentChatId) ?? "member";
    if (
      sectionAccessByChat.get(id) === "restricted" &&
      rootRole === "member" &&
      !allowedRestrictedSectionIds.has(id)
    ) continue;
    const channels = channelsByParent.get(parentChatId) ?? [];
    channels.push(createItem(id, parentChatId));
    channelsByParent.set(parentChatId, channels);
  }
  for (const channels of channelsByParent.values()) {
    channels.sort((a, b) => {
      const timeOrder = (b.lastMessage?.createdAt ?? "").localeCompare(
        a.lastMessage?.createdAt ?? "",
      );
      return timeOrder || (a.name ?? "").localeCompare(b.name ?? "", "ru");
    });
  }

  const items = chatIds.map((id) => {
    const item = createItem(id, null);
    item.channels = channelsByParent.get(id) ?? [];
    const latestChannelMessage = item.channels
      .map((channel) => channel.lastMessage)
      .filter((message): message is NonNullable<typeof message> => Boolean(message))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (
      latestChannelMessage &&
      (!item.lastMessage || latestChannelMessage.createdAt > item.lastMessage.createdAt)
    ) {
      item.lastMessage = latestChannelMessage;
    }
    return item;
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
): Promise<{
  messages: ChatMessageView[];
  otherUser: ChatListItem["otherUser"];
  chat: ChatThreadSummary & Pick<ChatListItem, "viewerRole">;
}> {
  const membership = await assertChatMemberRest(chatId, userId);
  const admin = getAdminClient();

  const [msgResult, membersResult, chatResult] = await Promise.all([
    admin
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(200),
    admin
      .from("chat_members")
      .select("user_id, role, users (id, username, display_name, last_seen_at, show_online_status, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id))")
      .eq("chat_id", membership.accessChatId),
    admin
      .from("chats")
      .select("id, type, name, parent_chat_id, topics_enabled, topics_layout, topic_icon, group_visibility, section_access_mode")
      .eq("id", chatId)
      .single(),
  ]);

  if (msgResult.error) throw new Error(msgResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (chatResult.error) throw new Error(chatResult.error.message);

  let otherUser: ChatListItem["otherUser"] = null;
  const viewerRole: ChatListItem["viewerRole"] = membership.role;
  for (const row of membersResult.data ?? []) {
    const uid = row.user_id as string;
    if (uid === userId) continue;
    const u = row.users as
      | {
          id: string;
          username: string;
          display_name: string;
          last_seen_at?: string | null;
          show_online_status?: boolean | null;
          subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[];
          profile_customization?: CustomizationRow | CustomizationRow[] | null;
        }
      | Array<{
          id: string;
          username: string;
          display_name: string;
          last_seen_at?: string | null;
          show_online_status?: boolean | null;
          subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[];
          profile_customization?: CustomizationRow | CustomizationRow[] | null;
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
        lastSeenAt: user.show_online_status === false ? null : (user.last_seen_at ?? null),
        ...compactAvatarFields(user.profile_customization),
      };
      break;
    }
  }

  const rows = (msgResult.data ?? []) as MessageRow[];
  const membersById = new Map<
    string,
    {
      username: string;
      displayName: string;
      hasVooplePlus: boolean;
      avatarUrl: string | null;
    }
  >();
  for (const row of membersResult.data ?? []) {
    const related = row.users as
      | {
          id: string;
          username: string;
          display_name: string;
          last_seen_at?: string | null;
          show_online_status?: boolean | null;
          subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[];
          profile_customization?: CustomizationRow | CustomizationRow[] | null;
        }
      | Array<{
          id: string;
          username: string;
          display_name: string;
          last_seen_at?: string | null;
          show_online_status?: boolean | null;
          subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[];
          profile_customization?: CustomizationRow | CustomizationRow[] | null;
        }>
      | null;
    const member = Array.isArray(related) ? related[0] : related;
    if (member) {
      const subscription = Array.isArray(member.subscriptions)
        ? member.subscriptions[0]
        : member.subscriptions;
      membersById.set(member.id, {
        username: member.username,
        displayName: member.display_name,
        hasVooplePlus: mapSubscriptionFields(subscription ?? undefined).hasVooplePlus,
        avatarUrl: compactAvatarFields(member.profile_customization).avatarUrl,
      });
    }
  }
  const messages = (await hydrateMessages(rows, userId)).map((message) => ({
    ...message,
    sender: membersById.get(message.senderId) ?? null,
  }));

  void markMessagesReadRest(chatId, userId);
  const community = (
    await loadGroupCommunitySummariesRest(
      membership.type === "group" ? [membership.accessChatId] : [],
      userId,
    )
  ).get(membership.accessChatId);

  return {
    messages,
    otherUser,
    chat: {
      id: chatId,
      type: (chatResult.data.type as "direct" | "group") ?? "direct",
      name: (chatResult.data.name as string | null) ?? null,
      parentChatId: membership.parentChatId,
      parentName: membership.parentName,
      topicsEnabled: Boolean(chatResult.data.topics_enabled),
      topicsLayout: chatResult.data.topics_layout === "tabs" ? "tabs" : "list",
      topicIcon: (chatResult.data.topic_icon as string | null) ?? null,
      groupVisibility: chatResult.data.group_visibility === "public" ? "public" : "private",
      sectionAccessMode: chatResult.data.section_access_mode === "restricted" ? "restricted" : "inherit",
      groupIcon: community?.icon ?? null,
      groupAvatarUrl: community?.avatarUrl ?? null,
      groupAccentColor: community?.effectiveAccentColor ?? null,
      boostCount: community?.boostCount ?? 0,
      boostedByMe: community?.boostedByMe ?? false,
      memberCount: (membersResult.data ?? []).length,
      viewerRole,
    },
  };
}

export async function markMessagesReadRest(chatId: string, userId: string) {
  await assertChatMemberRest(chatId, userId);
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

  await assertChatMemberRest(input.chatId, input.senderId);

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

export async function editMessageRest(
  messageId: string,
  userId: string,
  text: string,
) {
  const admin = getAdminClient();
  const trimmed = text.trim();
  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("id, chat_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError) throw new Error(messageError.message);
  if (!message) throw new Error("Сообщение не найдено");
  if ((message.sender_id as string) !== userId) {
    throw new Error("Можно редактировать только свои сообщения");
  }
  await assertChatMemberRest(message.chat_id as string, userId);

  const { data: updated, error } = await admin
    .from("messages")
    .update({ text: trimmed })
    .eq("id", messageId)
    .eq("sender_id", userId)
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw new Error(error.message);

  const [result] = await hydrateMessages([updated as MessageRow], userId);
  return result;
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
