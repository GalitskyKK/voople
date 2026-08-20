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
  | { type: "customEmoji"; emojiId: string; name: string }
  | { type: "gift"; itemId: string; itemName: string; message: string | null }
  | {
      type: "roomEvent";
      event: "started" | "ended" | "missed" | "declined" | "cancelled";
      durationSeconds: number | null;
      roomKind?: "direct" | "group";
    };

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
  const fallback = stored.map((node) => {
    if (node.type === "text") return node.text;
    if (node.type === "customEmoji") return `:${node.name}:`;
    if (node.type === "gift") return `🎁 Подарок: ${node.itemName}`;
    return node.event === "started" ? "Начата встреча" : "Событие встречи";
  }).join("");
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
    nodes?.map((node): ChatMessageContentNode => node.type === "customEmoji"
      ? { ...node, url: urls.get(node.emojiId) ?? null }
      : node) ?? null,
  ]));
}

export async function hydrateLegacyMessageContentRest(
  chatId: string,
  textByMessage: Map<string, string | null>,
) {
  const names = [...new Set([...textByMessage.values()].flatMap((text) =>
    [...(text ?? "").matchAll(/:([a-z0-9_]{2,32}):/g)].map((match) => match[1]!),
  ))];
  if (!names.length) return new Map<string, ChatMessageContentNode[]>();
  const { data, error } = await getAdminClient()
    .from("group_emojis")
    .select("id, name, storage_key, moderation_status")
    .eq("chat_id", chatId)
    .in("name", names);
  if (error) throw new Error(error.message);
  const emojis = new Map((data ?? [])
    .filter((row) => row.moderation_status === "automated_approved")
    .map((row) => [row.name as string, {
      emojiId: row.id as string,
      name: row.name as string,
      url: publicAssetUrl(row.storage_key as string),
    }] as const));

  const result = new Map<string, ChatMessageContentNode[]>();
  for (const [messageId, text] of textByMessage) {
    if (!text) continue;
    const nodes: ChatMessageContentNode[] = [];
    let cursor = 0;
    for (const match of text.matchAll(/:([a-z0-9_]{2,32}):/g)) {
      const emoji = emojis.get(match[1]!);
      if (!emoji) continue;
      const index = match.index ?? 0;
      if (index > cursor) nodes.push({ type: "text", text: text.slice(cursor, index) });
      nodes.push({ type: "customEmoji", ...emoji });
      cursor = index + match[0].length;
    }
    if (!nodes.length) continue;
    if (cursor < text.length) nodes.push({ type: "text", text: text.slice(cursor) });
    result.set(messageId, nodes);
  }
  return result;
}
