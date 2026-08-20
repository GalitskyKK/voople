import type { ChatMessageContentNode, GroupEmojiView } from "@/types/chat";

export type ChatMessageContentInputNode =
  | { type: "text"; text: string }
  | { type: "customEmoji"; emojiId: string };

export function parseComposerContent(
  text: string,
  emojis: GroupEmojiView[],
): ChatMessageContentInputNode[] {
  const byName = new Map(emojis.map((emoji) => [emoji.name, emoji]));
  const nodes: ChatMessageContentInputNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/:([a-z0-9_]{2,32}):/g)) {
    const index = match.index ?? 0;
    const emoji = byName.get(match[1]!);
    if (!emoji) continue;
    if (index > cursor) nodes.push({ type: "text", text: text.slice(cursor, index) });
    nodes.push({ type: "customEmoji", emojiId: emoji.id });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push({ type: "text", text: text.slice(cursor) });
  return nodes.length ? nodes : [{ type: "text", text }];
}

export function structuredContentFallback(nodes: ChatMessageContentNode[]) {
  return nodes.map((node) => {
    if (node.type === "text") return node.text;
    if (node.type === "customEmoji") return `:${node.name}:`;
    if (node.type === "gift") return `🎁 Подарок: ${node.itemName}`;
    if (node.event === "started") return node.roomKind === "group" ? "Комната открыта" : "Начат звонок";
    if (node.event === "missed") return "Пропущенный звонок";
    if (node.event === "declined") return "Звонок отклонён";
    if (node.event === "cancelled") return "Звонок отменён";
    return `Встреча завершена${node.durationSeconds === null ? "" : ` · ${formatRoomDuration(node.durationSeconds)}`}`;
  }).join("");
}

export function formatRoomDuration(durationSeconds: number) {
  const seconds = Math.max(0, Math.round(durationSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  if (minutes > 0) return `${minutes} мин`;
  return `${Math.max(1, seconds)} сек`;
}
