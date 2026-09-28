import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { normalizeGroupJoinPolicy, normalizeGroupVisibility } from "@/lib/chat/group-access";
import type { GroupJoinPolicy, GroupVisibility } from "@/types/chat";

export class ChatAccessDeniedError extends Error {}

export type ChatMembership = {
  chatId: string;
  accessChatId: string;
  parentChatId: string | null;
  parentName: string | null;
  role: "owner" | "admin" | "member";
  type: "direct" | "group";
  name: string | null;
  groupVisibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  sectionAccessMode: "inherit" | "restricted";
};

export async function getChatMembershipRest(
  chatId: string,
  userId: string,
): Promise<ChatMembership> {
  const admin = getAdminClient();
  const { data: chat, error: chatError } = await admin
    .from("chats")
    .select("id, type, name, parent_chat_id, group_visibility, join_policy, section_access_mode")
    .eq("id", chatId)
    .maybeSingle();

  if (chatError) throw new Error(chatError.message);
  if (!chat || (chat.type !== "direct" && chat.type !== "group")) {
    throw new ChatAccessDeniedError("Беседа недоступна");
  }

  const parentChatId = (chat.parent_chat_id as string | null) ?? null;
  const accessChatId = parentChatId ?? chatId;
  const [{ data: member, error: memberError }, parentResult] = await Promise.all([
    admin
      .from("chat_members")
      .select("role")
      .eq("chat_id", accessChatId)
      .eq("user_id", userId)
      .maybeSingle(),
    parentChatId
      ? admin
          .from("chats")
          .select("id, type, name, parent_chat_id")
          .eq("id", parentChatId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (memberError) throw new Error(memberError.message);
  if ("error" in parentResult && parentResult.error) throw new Error(parentResult.error.message);
  if (!member) throw new ChatAccessDeniedError("Нет доступа к этой беседе");
  const role: ChatMembership["role"] =
    member.role === "owner" || member.role === "admin" ? member.role : "member";
  if (
    parentChatId &&
    (!parentResult.data ||
      parentResult.data.type !== "group" ||
      parentResult.data.parent_chat_id)
  ) {
    throw new ChatAccessDeniedError("Родительская группа недоступна");
  }
  if (
    parentChatId &&
    chat.section_access_mode === "restricted" &&
    role === "member"
  ) {
    const { data: sectionMember, error: sectionMemberError } = await admin
      .from("chat_section_members")
      .select("chat_id")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sectionMemberError) throw new Error(sectionMemberError.message);
    if (!sectionMember) throw new ChatAccessDeniedError("Этот раздел доступен только выбранным участникам");
  }

  return {
    chatId,
    accessChatId,
    parentChatId,
    parentName:
      parentChatId && typeof parentResult.data?.name === "string"
        ? parentResult.data.name
        : null,
    role,
    type: chat.type,
    name: typeof chat.name === "string" ? chat.name : null,
    groupVisibility: normalizeGroupVisibility(chat.group_visibility),
    joinPolicy: normalizeGroupJoinPolicy(chat.join_policy),
    sectionAccessMode: chat.section_access_mode === "restricted" ? "restricted" : "inherit",
  };
}

export async function assertChatMemberRest(chatId: string, userId: string) {
  return getChatMembershipRest(chatId, userId);
}
