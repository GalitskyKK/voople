import { dayKeyFromIso, formatMessageDateLabel } from "@/lib/format/message-time";
import type { ChatMessageView } from "@/types/chat";

export type ChatTimelineItem =
  | { type: "date"; key: string; label: string }
  | {
      type: "message";
      message: ChatMessageView;
      groupPosition: "only" | "start" | "middle" | "end";
    };

const MESSAGE_GROUP_WINDOW_MS = 5 * 60_000;

function messagesBelongTogether(
  first: ChatMessageView | undefined,
  second: ChatMessageView | undefined,
) {
  if (!first || !second || first.senderId !== second.senderId) return false;
  if (dayKeyFromIso(first.createdAt) !== dayKeyFromIso(second.createdAt)) return false;
  return (
    Math.abs(Date.parse(second.createdAt) - Date.parse(first.createdAt)) <=
    MESSAGE_GROUP_WINDOW_MS
  );
}

export function buildChatTimeline(messages: ChatMessageView[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  let lastDayKey = "";

  for (const [index, message] of messages.entries()) {
    const dayKey = dayKeyFromIso(message.createdAt);
    if (dayKey !== lastDayKey) {
      items.push({
        type: "date",
        key: `date-${dayKey}`,
        label: formatMessageDateLabel(message.createdAt),
      });
      lastDayKey = dayKey;
    }
    const joinsPrevious = messagesBelongTogether(messages[index - 1], message);
    const joinsNext = messagesBelongTogether(message, messages[index + 1]);
    const groupPosition = joinsPrevious
      ? joinsNext
        ? "middle"
        : "end"
      : joinsNext
        ? "start"
        : "only";
    items.push({ type: "message", message, groupPosition });
  }

  return items;
}
