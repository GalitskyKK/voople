import { dayKeyFromIso, formatMessageDateLabel } from "@/lib/format/message-time";
import type { ChatMessageView } from "@/types/chat";

export type ChatTimelineItem =
  | { type: "date"; key: string; label: string }
  | { type: "message"; message: ChatMessageView };

export function buildChatTimeline(messages: ChatMessageView[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  let lastDayKey = "";

  for (const message of messages) {
    const dayKey = dayKeyFromIso(message.createdAt);
    if (dayKey !== lastDayKey) {
      items.push({
        type: "date",
        key: `date-${dayKey}`,
        label: formatMessageDateLabel(message.createdAt),
      });
      lastDayKey = dayKey;
    }
    items.push({ type: "message", message });
  }

  return items;
}
