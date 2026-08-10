import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { loadMessageReactionsRest } from "@/server/data/chat-reactions-rest";

export async function deleteMessageRest(messageId: string, userId: string) {
  const admin = getAdminClient();
  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("id, chat_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) throw new Error(messageError.message);
  if (!message) throw new Error("Сообщение не найдено");
  if (message.sender_id !== userId) throw new Error("Можно удалить только свои сообщения");

  await assertChatMemberRest(message.chat_id as string, userId);
  const { error } = await admin.from("messages").delete().eq("id", messageId);
  if (error) throw new Error(error.message);
  return { id: messageId };
}

export async function toggleMessageReactionRest(
  messageId: string,
  userId: string,
  emoji: string,
) {
  if (!CHAT_REACTION_EMOJIS.includes(emoji as (typeof CHAT_REACTION_EMOJIS)[number])) {
    throw new Error("Эта реакция не поддерживается");
  }
  const admin = getAdminClient();
  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("id, chat_id")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) throw new Error(messageError.message);
  if (!message) throw new Error("Сообщение не найдено");

  const chatId = message.chat_id as string;
  await assertChatMemberRest(chatId, userId);
  const { data: existing, error: existingError } = await admin
    .from("message_reactions")
    .select("message_id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const query = existing
    ? admin.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji)
    : admin.from("message_reactions").insert({ message_id: messageId, chat_id: chatId, user_id: userId, emoji });
  const { error } = await query;
  if (error) throw new Error(error.message);

  const reactions = await loadMessageReactionsRest([messageId], userId);
  return { messageId, reactions: reactions.get(messageId) ?? [] };
}
