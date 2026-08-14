import { publicAssetUrl } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { hasActiveSubscriptionRest } from "@/server/data/subscription-rest";
import type { ChatMessageContentNode } from "@/types/chat";

export type ChatMessageContentInputNode =
  | { type: "text"; text: string }
  | { type: "customEmoji"; emojiId: string };

export type StoredChatMessageContentNode =
  | { type: "text"; text: string }
  | { type: "customEmoji"; emojiId: string; name: string };

export async function prepareMessageContentRest(
  chatId: string,
  userId: string,
  nodes: ChatMessageContentInputNode[],
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (nodes.length === 0 || nodes.length > 100) throw new Error("Некорректное содержимое сообщения");
  const emojiIds = [...new Set(nodes.flatMap((node) => node.type === "customEmoji" ? [node.emojiId] : []))];
  const admin = getAdminClient();
  const { data, error } = emojiIds.length
    ? await admin.from("group_emojis").select("id, chat_id, name, moderation_status").in("id", emojiIds)
    : { data: [], error: null };
  if (error) throw new Error(error.message);
  const emojis = new Map((data ?? []).map((row) => [row.id as string, row] as const));
  if (emojis.size !== emojiIds.length) throw new Error("Один из эмодзи больше недоступен");

  const foreignGroupIds = [...new Set((data ?? [])
    .filter((row) => row.chat_id !== membership.accessChatId)
    .map((row) => row.chat_id as string))];
  if (foreignGroupIds.length > 0) {
    if (!await hasActiveSubscriptionRest(userId)) throw new Error("Эмодзи других групп доступны с Вупл+");
    const { data: memberships, error: membershipsError } = await admin
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", userId)
      .in("chat_id", foreignGroupIds);
    if (membershipsError) throw new Error(membershipsError.message);
    if (new Set((memberships ?? []).map((row) => row.chat_id as string)).size !== foreignGroupIds.length) {
      throw new Error("Нет доступа к набору эмодзи");
    }
  }

  const stored: StoredChatMessageContentNode[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      if (node.text) stored.push({ type: "text", text: node.text });
      continue;
    }
    const emoji = emojis.get(node.emojiId)!;
    if (emoji.moderation_status !== "automated_approved") throw new Error("Эмодзи ожидает модерации");
    stored.push({ type: "customEmoji", emojiId: node.emojiId, name: emoji.name as string });
  }
  const fallback = stored.map((node) => node.type === "text" ? node.text : `:${node.name}:`).join("");
  if (!fallback.trim() || fallback.length > 1000) throw new Error("Сообщение должно содержать от 1 до 1000 символов");
  return { stored, fallback };
}

export async function hydrateMessageContentRest(
  contentByMessage: Map<string, StoredChatMessageContentNode[] | null>,
) {
  const emojiIds = [...new Set([...contentByMessage.values()].flatMap((nodes) =>
    (nodes ?? []).flatMap((node) => node.type === "customEmoji" ? [node.emojiId] : []),
  ))];
  const { data, error } = emojiIds.length
    ? await getAdminClient().from("group_emojis").select("id, storage_key, moderation_status").in("id", emojiIds)
    : { data: [], error: null };
  if (error) throw new Error(error.message);
  const urls = new Map((data ?? []).map((row) => [
    row.id as string,
    row.moderation_status === "automated_approved" ? publicAssetUrl(row.storage_key as string) : null,
  ] as const));
  return new Map([...contentByMessage].map(([messageId, nodes]) => [
    messageId,
    nodes?.map((node): ChatMessageContentNode => node.type === "text"
      ? node
      : { ...node, url: urls.get(node.emojiId) ?? null }) ?? null,
  ]));
}
