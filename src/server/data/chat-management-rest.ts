import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import {
  recordGroupAuditBatchRest,
  recordGroupAuditRest,
} from "@/server/data/chat-group-audit-rest";
import {
  mapUserSearchRow,
  type UserSearchRow,
} from "@/server/mappers/user-search";
import type { UserSearchHit } from "@/types/search";

const USER_CARD_SELECT =
  "id, username, display_name, bio, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)";

async function getFollowContactIds(userId: string) {
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

  const followerIds = new Set(
    (followerResult.data ?? []).map((row) => row.follower_id as string),
  );
  const followingIds = new Set(
    (followingResult.data ?? []).map((row) => row.following_id as string),
  );
  return { followerIds, followingIds };
}

async function getMutualContactIds(userId: string) {
  const { followerIds, followingIds } = await getFollowContactIds(userId);
  return new Set([...followingIds].filter((id) => followerIds.has(id)));
}

async function loadContactCards(contactIds: string[], query: string) {
  if (contactIds.length === 0) return [];
  const admin = getAdminClient();
  let usersQuery = admin
    .from("users")
    .select(USER_CARD_SELECT)
    .in("id", contactIds)
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
  return loadContactCards(candidateIds, query);
}

export async function listChatContactsRest(userId: string, query = "") {
  const { followerIds, followingIds } = await getFollowContactIds(userId);
  return loadContactCards([...new Set([...followerIds, ...followingIds])], query);
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

  await recordGroupAuditBatchRest(
    newIds.map((newUserId) => ({
      chatId: membership.accessChatId,
      actorId: userId,
      targetUserId: newUserId,
      action: "member_added" as const,
    })),
  );

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
    throw new Error("Разделы настраиваются в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Настраивать разделы могут владелец и администраторы группы");
  }

  const admin = getAdminClient();
  if (!enabled) {
    const { count, error: countError } = await admin
      .from("chats")
      .select("id", { count: "exact", head: true })
      .eq("parent_chat_id", chatId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error("Сначала удалите или перенесите существующие разделы");
    }
  }

  const { error } = await admin
    .from("chats")
    .update({ topics_enabled: enabled, topics_layout: layout })
    .eq("id", chatId);
  if (error) throw new Error(error.message);
  await recordGroupAuditRest({
    chatId: membership.accessChatId,
    actorId: userId,
    action: "topics_changed",
    details: { enabled, layout },
  });
  return { topicsEnabled: enabled, topicsLayout: layout };
}

export async function setGroupVisibilityRest(
  chatId: string,
  userId: string,
  visibility: "private" | "unlisted" | "public",
  joinPolicy: "open" | "request" | "invite_only",
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Тип доступа настраивается в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Тип доступа могут менять владелец и администраторы группы");
  }
  const { error } = await getAdminClient()
    .from("chats")
    .update({ group_visibility: visibility, join_policy: joinPolicy })
    .eq("id", chatId);
  if (error) throw new Error(error.message);
  await recordGroupAuditRest({
    chatId: membership.accessChatId,
    actorId: userId,
    action: "visibility_changed",
    details: { visibility, joinPolicy },
  });
  return { visibility, joinPolicy };
}

async function clearGroupRoomPresence(chatId: string, userId: string) {
  const admin = getAdminClient();
  const { data: topics, error: topicsError } = await admin
    .from("chats")
    .select("id")
    .eq("parent_chat_id", chatId);
  if (topicsError) throw new Error(topicsError.message);

  const chatIds = [chatId, ...(topics ?? []).map((topic) => topic.id as string)];
  const { error } = await admin
    .from("chat_room_participants")
    .delete()
    .in("chat_id", chatIds)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function removeGroupMemberRest(
  chatId: string,
  actorId: string,
  memberId: string,
) {
  const membership = await assertChatMemberRest(chatId, actorId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Участники управляются в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Исключать участников могут владелец и администраторы группы");
  }
  if (actorId === memberId) {
    throw new Error("Для своего аккаунта используйте выход из группы");
  }

  const admin = getAdminClient();
  const { data: target, error: targetError } = await admin
    .from("chat_members")
    .select("role")
    .eq("chat_id", membership.accessChatId)
    .eq("user_id", memberId)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Участник уже покинул группу");
  if (target.role === "owner") throw new Error("Владельца группы исключить нельзя");
  if (membership.role === "admin" && target.role !== "member") {
    throw new Error("Администратор может исключать только обычных участников");
  }

  const { error } = await admin
    .from("chat_members")
    .delete()
    .eq("chat_id", membership.accessChatId)
    .eq("user_id", memberId);
  if (error) throw new Error(error.message);
  await clearGroupRoomPresence(membership.accessChatId, memberId);
  await recordGroupAuditRest({
    chatId: membership.accessChatId,
    actorId,
    targetUserId: memberId,
    action: "member_removed",
  });
  return { removed: true };
}

export async function leaveGroupRest(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Выйти можно только из основной группы");
  }
  if (membership.role === "owner") {
    throw new Error("Владелец должен удалить группу или сначала передать права");
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("chat_members")
    .delete()
    .eq("chat_id", membership.accessChatId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await clearGroupRoomPresence(membership.accessChatId, userId);
  await recordGroupAuditRest({
    chatId: membership.accessChatId,
    actorId: userId,
    targetUserId: userId,
    action: "member_left",
  });
  return { left: true };
}

export async function deleteGroupRest(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Удалить можно только основную группу");
  }
  if (membership.role !== "owner") {
    throw new Error("Удалить группу может только владелец");
  }

  const admin = getAdminClient();
  const { error } = await admin.from("chats").delete().eq("id", chatId);
  if (error) throw new Error(error.message);
  return { deleted: true };
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
  accessMode: "inherit" | "restricted" = "inherit",
  memberIds: string[] = [],
) {
  const membership = await assertChatMemberRest(parentChatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Разделы можно создавать только внутри основной группы");
  }
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 50) {
    throw new Error("Название — от 2 до 50 символов");
  }
  if (
    accessMode === "restricted" &&
    membership.role !== "owner" &&
    membership.role !== "admin"
  ) {
    throw new Error("Закрытые разделы могут создавать владелец и администраторы");
  }

  const admin = getAdminClient();
  const { data: parent, error: parentError } = await admin
    .from("chats")
    .select("topics_enabled")
    .eq("id", parentChatId)
    .single();
  if (parentError) throw new Error(parentError.message);
  if (!parent.topics_enabled) {
    throw new Error("Сначала включите разделы в настройках группы");
  }

  const { count, error: countError } = await admin
    .from("chats")
    .select("id", { count: "exact", head: true })
    .eq("parent_chat_id", parentChatId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= 30) throw new Error("В группе может быть до 30 разделов");

  const uniqueMemberIds = [...new Set(memberIds)].filter((id) => id !== userId);
  if (accessMode === "restricted" && uniqueMemberIds.length > 0) {
    const { data: rootMembers, error: rootMembersError } = await admin
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", parentChatId)
      .in("user_id", uniqueMemberIds);
    if (rootMembersError) throw new Error(rootMembersError.message);
    if ((rootMembers ?? []).length !== uniqueMemberIds.length) {
      throw new Error("В закрытый раздел можно добавить только участников основной группы");
    }
  }

  const { data, error } = await admin
    .from("chats")
    .insert({
      type: "group",
      name: cleanName,
      parent_chat_id: parentChatId,
      topic_icon: icon?.trim() || null,
      section_access_mode: accessMode,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (accessMode === "restricted" && uniqueMemberIds.length > 0) {
    const { error: sectionMembersError } = await admin
      .from("chat_section_members")
      .insert(
        uniqueMemberIds.map((memberId) => ({
          chat_id: data.id,
          user_id: memberId,
        })),
      );
    if (sectionMembersError) {
      await admin.from("chats").delete().eq("id", data.id);
      throw new Error(sectionMembersError.message);
    }
  }
  return data.id as string;
}

export async function setSectionAccessRest(
  chatId: string,
  userId: string,
  accessMode: "inherit" | "restricted",
  memberIds: string[],
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || !membership.parentChatId) {
    throw new Error("Доступ участников настраивается внутри раздела");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Доступ раздела могут менять владелец и администраторы");
  }
  const uniqueMemberIds = [...new Set(memberIds)].filter((id) => id !== userId);
  const admin = getAdminClient();
  if (accessMode === "restricted" && uniqueMemberIds.length > 0) {
    const { data: rootMembers, error: rootMembersError } = await admin
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", membership.accessChatId)
      .in("user_id", uniqueMemberIds);
    if (rootMembersError) throw new Error(rootMembersError.message);
    if ((rootMembers ?? []).length !== uniqueMemberIds.length) {
      throw new Error("Выбранный пользователь не состоит в основной группе");
    }
  }

  const [{ data: previousChat, error: previousChatError }, { data: previousRows, error: previousRowsError }] = await Promise.all([
    admin.from("chats").select("section_access_mode").eq("id", chatId).single(),
    admin.from("chat_section_members").select("user_id").eq("chat_id", chatId),
  ]);
  if (previousChatError) throw new Error(previousChatError.message);
  if (previousRowsError) throw new Error(previousRowsError.message);

  try {
    const { error: updateError } = await admin.from("chats").update({ section_access_mode: accessMode }).eq("id", chatId);
    if (updateError) throw new Error(updateError.message);
    const { error: clearError } = await admin.from("chat_section_members").delete().eq("chat_id", chatId);
    if (clearError) throw new Error(clearError.message);
    if (accessMode === "restricted" && uniqueMemberIds.length > 0) {
      const { error: insertError } = await admin.from("chat_section_members").insert(
        uniqueMemberIds.map((memberId) => ({ chat_id: chatId, user_id: memberId })),
      );
      if (insertError) throw new Error(insertError.message);
    }
  } catch (cause) {
    await admin.from("chats").update({ section_access_mode: previousChat.section_access_mode }).eq("id", chatId);
    await admin.from("chat_section_members").delete().eq("chat_id", chatId);
    if ((previousRows ?? []).length > 0) {
      await admin.from("chat_section_members").insert(
        (previousRows ?? []).map((row) => ({ chat_id: chatId, user_id: row.user_id })),
      );
    }
    throw cause;
  }
  return { accessMode, memberIds: uniqueMemberIds };
}

export async function getSectionAccessRest(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || !membership.parentChatId) {
    throw new Error("Это не раздел группы");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Настройки раздела доступны владельцу и администраторам");
  }
  const admin = getAdminClient();
  const [{ data: chat, error: chatError }, { data: rows, error: rowsError }] = await Promise.all([
    admin.from("chats").select("section_access_mode").eq("id", chatId).single(),
    admin.from("chat_section_members").select("user_id").eq("chat_id", chatId),
  ]);
  if (chatError) throw new Error(chatError.message);
  if (rowsError) throw new Error(rowsError.message);
  return {
    accessMode: chat.section_access_mode === "restricted" ? "restricted" as const : "inherit" as const,
    selectedMemberIds: (rows ?? []).map((row) => row.user_id as string),
  };
}
