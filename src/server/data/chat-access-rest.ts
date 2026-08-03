import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export type ChatMembership = {
  chatId: string;
  accessChatId: string;
  parentChatId: string | null;
  parentName: string | null;
  role: "owner" | "admin" | "member";
  type: "direct" | "group";
  name: string | null;
};

export async function getChatMembershipRest(
  chatId: string,
  userId: string,
): Promise<ChatMembership> {
  const admin = getAdminClient();
  const { data: chat, error: chatError } = await admin
    .from("chats")
    .select("id, type, name, parent_chat_id")
    .eq("id", chatId)
    .maybeSingle();

  if (chatError) throw new Error(chatError.message);
  if (!chat || (chat.type !== "direct" && chat.type !== "group")) {
    throw new Error("Беседа недоступна");
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
  if (!member) throw new Error("Нет доступа к этой беседе");
  if (
    parentChatId &&
    (!parentResult.data ||
      parentResult.data.type !== "group" ||
      parentResult.data.parent_chat_id)
  ) {
    throw new Error("Родительская группа недоступна");
  }

  return {
    chatId,
    accessChatId,
    parentChatId,
    parentName:
      parentChatId && typeof parentResult.data?.name === "string"
        ? parentResult.data.name
        : null,
    role:
      member.role === "owner" || member.role === "admin"
        ? member.role
        : "member",
    type: chat.type,
    name: typeof chat.name === "string" ? chat.name : null,
  };
}

export async function assertChatMemberRest(chatId: string, userId: string) {
  return getChatMembershipRest(chatId, userId);
}
