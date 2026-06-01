import { getAdminClient } from "@/lib/supabase/admin";

export type ChatListItem = {
  id: string;
  type: "direct" | "group";
  otherUser: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  lastMessage: {
    text: string | null;
    createdAt: string;
    senderId: string;
  } | null;
};

export type ChatMessageView = {
  id: string;
  senderId: string;
  text: string | null;
  createdAt: string;
  isMine: boolean;
};

type DirectChatRpcResult = string | { get_or_create_direct_chat?: string } | null;

type MessageRow = {
  id: string;
  sender_id: string;
  text: string | null;
  created_at: string;
};

function mapMessageRow(row: MessageRow, viewerId: string): ChatMessageView {
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text ?? null,
    createdAt: row.created_at,
    isMine: row.sender_id === viewerId,
  };
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

  const othersByChat = new Map<string, { id: string; username: string; displayName: string }>();
  if (otherUserIds.size > 0) {
    const { data: users, error: usersErr } = await admin
      .from("users")
      .select("id, username, display_name")
      .in("id", [...otherUserIds]);

    if (usersErr) throw new Error(usersErr.message);

    const userById = new Map(
      (users ?? []).map((u) => [
        u.id as string,
        {
          id: u.id as string,
          username: u.username as string,
          displayName: u.display_name as string,
        },
      ]),
    );

    for (const [cid, oid] of otherIdByChat) {
      const u = userById.get(oid);
      if (u) othersByChat.set(cid, u);
    }
  }

  const recentMsgs = msgsResult.data;

  const lastByChat = new Map<
    string,
    { text: string | null; createdAt: string; senderId: string }
  >();
  for (const m of recentMsgs ?? []) {
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

export async function listMessagesRest(
  chatId: string,
  userId: string,
): Promise<{ messages: ChatMessageView[]; otherUser: ChatListItem["otherUser"] }> {
  await assertMember(chatId, userId);
  const admin = getAdminClient();

  const [msgResult, membersResult] = await Promise.all([
    admin
      .from("messages")
      .select("id, sender_id, text, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100),
    admin
      .from("chat_members")
      .select("user_id, users (id, username, display_name)")
      .eq("chat_id", chatId),
  ]);

  if (msgResult.error) throw new Error(msgResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);

  let otherUser: ChatListItem["otherUser"] = null;
  for (const row of membersResult.data ?? []) {
    const uid = row.user_id as string;
    if (uid === userId) continue;
    const u = row.users as
      | { id: string; username: string; display_name: string }
      | { id: string; username: string; display_name: string }[]
      | null;
    const user = Array.isArray(u) ? u[0] : u;
    if (user) {
      otherUser = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      };
      break;
    }
  }

  return {
    messages: ((msgResult.data ?? []) as MessageRow[]).map((m) => mapMessageRow(m, userId)),
    otherUser,
  };
}

export async function sendMessageRest(
  chatId: string,
  senderId: string,
  text: string,
  messageId: string,
) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Введите сообщение");
  if (trimmed.length > 1000) throw new Error("Максимум 1000 символов");

  await assertMember(chatId, senderId);

  const admin = getAdminClient();
  const { data: row, error } = await admin
    .from("messages")
    .insert({ id: messageId, chat_id: chatId, sender_id: senderId, text: trimmed })
    .select("id, sender_id, text, created_at")
    .single();

  if (error) {
    if (error.code !== "23505") throw new Error(error.message);

    const { data: existing, error: existingErr } = await admin
      .from("messages")
      .select("id, sender_id, text, created_at")
      .eq("id", messageId)
      .eq("chat_id", chatId)
      .maybeSingle();

    if (existingErr) throw new Error(existingErr.message);
    if (!existing) throw new Error("Не удалось подтвердить отправку сообщения");
    if (existing.sender_id !== senderId) throw new Error("ID сообщения уже занят");

    return mapMessageRow(existing as MessageRow, senderId);
  }

  return mapMessageRow(row as MessageRow, senderId);
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
