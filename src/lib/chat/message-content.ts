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
  return nodes.map((node) => node.type === "text" ? node.text : `:${node.name}:`).join("");
}
