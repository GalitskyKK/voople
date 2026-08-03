import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import {
  mapUserSearchRow,
  type UserSearchRow,
} from "@/server/mappers/user-search";
import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

const USER_CARD_SELECT =
  "id, username, display_name, bio, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)";

async function getMutualContactIds(userId: string) {
  const admin = getAdminClient();
  const [followingResult, followerResult] = await Promise.all([
    admin
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .limit(1_000),
    admin
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId)
      .limit(1_000),
  ]);

  if (followingResult.error) throw new Error(followingResult.error.message);
  if (followerResult.error) throw new Error(followerResult.error.message);

  const followers = new Set(
    (followerResult.data ?? []).map((row) => row.follower_id as string),
  );
  return new Set(
    (followingResult.data ?? [])
      .map((row) => row.following_id as string)
      .filter((id) => followers.has(id)),
  );
}

async function assertMutualContacts(userId: string, contactIds: string[]) {
  if (contactIds.length === 0) return;
  const mutualIds = await getMutualContactIds(userId);
  if (contactIds.some((id) => !mutualIds.has(id))) {
    throw new Error(
      "Напрямую можно добавить только пользователей с взаимной подпиской. Остальным отправьте ссылку-приглашение.",
    );
  }
}

export async function listGroupContactsRest(
  userId: string,
  query = "",
  chatId?: string,
): Promise<UserSearchHit[]> {
  const mutualIds = await getMutualContactIds(userId);
  const excludedIds = new Set<string>([userId]);

  if (chatId) {
    const membership = await assertChatMemberRest(chatId, userId);
    if (membership.type !== "group" || membership.parentChatId) {
      throw new Error("Участники управляются в основной группе");
    }
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Добавлять участников могут владелец и администраторы группы");
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", membership.accessChatId);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) excludedIds.add(row.user_id as string);
  }

  const candidateIds = [...mutualIds].filter((id) => !excludedIds.has(id));
  if (candidateIds.length === 0) return [];

  const admin = getAdminClient();
  let usersQuery = admin
    .from("users")
    .select(USER_CARD_SELECT)
    .in("id", candidateIds)
    .order("display_name")
    .limit(50);
  const cleanQuery = query.trim().replace(/[%_,()]/g, "");
  if (cleanQuery) {
    const pattern = `%${cleanQuery}%`;
    usersQuery = usersQuery.or(
      `username.ilike.${pattern},display_name.ilike.${pattern}`,
    );
  }

  const { data, error } = await usersQuery;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapUserSearchRow(row as UserSearchRow));
}

export async function listGroupMembersRest(
  chatId: string,
  userId: string,
): Promise<ChatGroupMemberView[]> {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group") throw new Error("Это не групповая беседа");

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_members")
    .select(`user_id, role, joined_at, users (${USER_CARD_SELECT})`)
    .eq("chat_id", membership.accessChatId)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? [])
    .flatMap((row) => {
      const relation = row.users as UserSearchRow | UserSearchRow[] | null;
      const user = Array.isArray(relation) ? relation[0] : relation;
      if (!user) return [];
      const role: ChatGroupMemberView["role"] =
        row.role === "owner" || row.role === "admin" ? row.role : "member";
      return [{ ...mapUserSearchRow(user), role } satisfies ChatGroupMemberView];
    })
    .sort((a, b) => {
      const priority = { owner: 0, admin: 1, member: 2 } as const;
      return priority[a.role] - priority[b.role];
    });
}

export async function addGroupMembersRest(
  chatId: string,
  userId: string,
  memberIds: string[],
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Участники управляются в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Добавлять участников могут владелец и администраторы группы");
  }

  const uniqueIds = [...new Set(memberIds)].filter((id) => id !== userId);
  const admin = getAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", membership.accessChatId);
  if (existingError) throw new Error(existingError.message);

  const existingIds = new Set(
    (existing ?? []).map((row) => row.user_id as string),
  );
  const newIds = uniqueIds.filter((id) => !existingIds.has(id));
  if (newIds.length === 0) {
    return { addedCount: 0, memberCount: existingIds.size };
  }
  if (existingIds.size + newIds.length > 20) {
    throw new Error("В группе может быть до 20 участников");
  }

  await assertMutualContacts(userId, newIds);
  const { error } = await admin.from("chat_members").insert(
    newIds.map((newUserId) => ({
      chat_id: membership.accessChatId,
      user_id: newUserId,
      role: "member",
    })),
  );
  if (error) throw new Error(error.message);

  return { addedCount: newIds.length, memberCount: existingIds.size + newIds.length };
}

export async function setGroupTopicsRest(
  chatId: string,
  userId: string,
  enabled: boolean,
  layout: "tabs" | "list",
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Темы настраиваются в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Настраивать темы могут владелец и администраторы группы");
  }

  const admin = getAdminClient();
  if (!enabled) {
    const { count, error: countError } = await admin
      .from("chats")
      .select("id", { count: "exact", head: true })
      .eq("parent_chat_id", chatId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error("Сначала удалите или перенесите существующие темы");
    }
  }

  const { error } = await admin
    .from("chats")
    .update({ topics_enabled: enabled, topics_layout: layout })
    .eq("id", chatId);
  if (error) throw new Error(error.message);
  return { topicsEnabled: enabled, topicsLayout: layout };
}

type DirectChatRpcResult = string | { get_or_create_direct_chat?: string } | null;

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

export async function createGroupChatRest(ownerId: string, name: string, memberIds: string[]) {
  const cleanName = name.trim();
  const uniqueMemberIds = [...new Set(memberIds)].filter((id) => id !== ownerId);
  if (cleanName.length < 2 || cleanName.length > 50) throw new Error("Название — от 2 до 50 символов");
  if (uniqueMemberIds.length > 19) throw new Error("В группе может быть до 20 участников");

  await assertMutualContacts(ownerId, uniqueMemberIds);

  const admin = getAdminClient();
  if (uniqueMemberIds.length > 0) {
    const { data: existingUsers, error: usersError } = await admin
      .from("users")
      .select("id")
      .in("id", uniqueMemberIds);
    if (usersError) throw new Error(usersError.message);
    if ((existingUsers ?? []).length !== uniqueMemberIds.length) {
      throw new Error("Один из участников не найден");
    }
  }

  const { data: chat, error: chatError } = await admin
    .from("chats")
    .insert({ type: "group", name: cleanName })
    .select("id")
    .single();
  if (chatError) throw new Error(chatError.message);

  const { error: membersError } = await admin.from("chat_members").insert(
    [ownerId, ...uniqueMemberIds].map((userId, index) => ({
      chat_id: chat.id,
      user_id: userId,
      role: index === 0 ? "owner" : "member",
    })),
  );
  if (membersError) {
    await admin.from("chats").delete().eq("id", chat.id);
    throw new Error(membersError.message);
  }
  return chat.id as string;
}

export async function createSubchatRest(
  parentChatId: string,
  userId: string,
  name: string,
  icon: string | null,
) {
  const membership = await assertChatMemberRest(parentChatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Подчаты можно создавать только внутри основной группы");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Создавать подчаты могут владелец и администраторы группы");
  }

  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 50) {
    throw new Error("Название — от 2 до 50 символов");
  }

  const admin = getAdminClient();
  const { data: parent, error: parentError } = await admin
    .from("chats")
    .select("topics_enabled")
    .eq("id", parentChatId)
    .single();
  if (parentError) throw new Error(parentError.message);
  if (!parent.topics_enabled) {
    throw new Error("Сначала включите темы в настройках группы");
  }

  const { count, error: countError } = await admin
    .from("chats")
    .select("id", { count: "exact", head: true })
    .eq("parent_chat_id", parentChatId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= 30) throw new Error("В группе может быть до 30 подчатов");

  const { data, error } = await admin
    .from("chats")
    .insert({
      type: "group",
      name: cleanName,
      parent_chat_id: parentChatId,
      topic_icon: icon?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
