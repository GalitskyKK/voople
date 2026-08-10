import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import { chatAttachmentKindFromKey, chatAudioKindFromKey } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { loadMessageReactionsRest } from "@/server/data/chat-reactions-rest";
import type { ChatMessageNotificationView } from "@/types/chat";

export async function getMessageNotificationRest(
  messageId: string,
  userId: string,
): Promise<ChatMessageNotificationView | null> {
  const admin = getAdminClient();
  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("id, chat_id, sender_id, text, media_url, media_title, shared_track_id")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) throw new Error(messageError.message);
  if (!message || message.sender_id === userId) return null;

  const membership = await assertChatMemberRest(message.chat_id as string, userId);
  const { data: sender, error: senderError } = await admin
    .from("users")
    .select("display_name")
    .eq("id", message.sender_id as string)
    .maybeSingle();
  if (senderError) throw new Error(senderError.message);
  if (!sender) throw new Error("Отправитель сообщения недоступен");

  const senderName = (sender.display_name as string | null)?.trim() || "Пользователь Voople";
  const groupName = membership.parentName ?? membership.name ?? "Группа";
  const sectionName = membership.parentChatId ? membership.name : null;
  const chatTitle =
    membership.type === "direct"
      ? senderName
      : sectionName
        ? `${groupName} · ${sectionName}`
        : groupName;

  let previewText = (message.text as string | null)?.trim() ?? "";
  const mediaKey = message.media_url as string | null;
  if (!previewText && mediaKey) {
    const kind = chatAttachmentKindFromKey(mediaKey);
    previewText =
      kind === "image"
        ? "Отправил(а) изображение"
        : kind === "circle"
          ? "Отправил(а) видеосообщение"
          : chatAudioKindFromKey(mediaKey) === "voice" || message.media_title === "Голосовое сообщение"
            ? "Отправил(а) голосовое сообщение"
            : "Отправил(а) аудиофайл";
  }
  if (!previewText && message.shared_track_id) previewText = "Поделился(-ась) треком";
  if (!previewText) previewText = "Новое сообщение";

  return {
    messageId: message.id as string,
    chatId: message.chat_id as string,
    senderName,
    chatTitle,
    previewText,
  };
}

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
