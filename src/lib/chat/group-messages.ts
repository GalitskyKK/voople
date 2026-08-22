import { dayKeyFromIso, formatMessageDateLabel } from "@/lib/format/message-time";
import { summarizeGroupRoomActivity } from "@/lib/chat/room-activity";
import type { ChatMessageView } from "@/types/chat";

export type ChatTimelineItem =
  | { type: "date"; key: string; label: string }
  | { type: "roomSummary"; key: string; dayLabel: string; durationSeconds: number; sessions: number }
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
  const roomSummaries = summarizeGroupRoomActivity(messages.flatMap((message) => {
    const event = message.content?.find((node) => node.type === "roomEvent");
    return event && event.type === "roomEvent"
      ? [{ dayKey: dayKeyFromIso(message.createdAt), event: event.event, durationSeconds: event.durationSeconds, roomKind: event.roomKind }]
      : [];
  }));
  const visibleMessages = messages.filter((message) => {
    const event = message.content?.find((node) => node.type === "roomEvent");
    if (!event || event.type !== "roomEvent" || event.roomKind !== "group") return true;
    return false;
  });

  for (const [index, message] of visibleMessages.entries()) {
    const dayKey = dayKeyFromIso(message.createdAt);
    if (dayKey !== lastDayKey) {
      items.push({
        type: "date",
        key: `date-${dayKey}`,
        label: formatMessageDateLabel(message.createdAt),
      });
      lastDayKey = dayKey;
      const roomSummary = roomSummaries.get(dayKey);
      if (roomSummary?.sessions) {
        items.push({ type: "roomSummary", key: `room-summary-${dayKey}`, dayLabel: formatMessageDateLabel(message.createdAt), ...roomSummary });
      }
    }
    const joinsPrevious = messagesBelongTogether(visibleMessages[index - 1], message);
    const joinsNext = messagesBelongTogether(message, visibleMessages[index + 1]);
    const groupPosition = joinsPrevious
      ? joinsNext
        ? "middle"
        : "end"
      : joinsNext
        ? "start"
        : "only";
    items.push({ type: "message", message, groupPosition });
  }

  for (const [dayKey, roomSummary] of roomSummaries) {
    if (items.some((item) => item.type === "roomSummary" && item.key === `room-summary-${dayKey}`)) continue;
    const source = messages.find((message) => dayKeyFromIso(message.createdAt) === dayKey);
    if (!source) continue;
    items.push({ type: "date", key: `date-${dayKey}`, label: formatMessageDateLabel(source.createdAt) });
    items.push({ type: "roomSummary", key: `room-summary-${dayKey}`, dayLabel: formatMessageDateLabel(source.createdAt), ...roomSummary });
  }

  return items;
}
