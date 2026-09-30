import { parseDatabaseDate } from "@/lib/format/database-date";
import { dayKeyFromIso, formatMessageDateLabel } from "@/lib/format/message-time";
import { messageRoomContextKey } from "@/lib/chat/message-room-context";
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
  if (first.replyTo || second.replyTo) return false;
  if (dayKeyFromIso(first.createdAt) !== dayKeyFromIso(second.createdAt)) return false;
  if (messageRoomContextKey(first.roomContext) !== messageRoomContextKey(second.roomContext)) {
    return false;
  }
  return (
    Math.abs(parseDatabaseDate(second.createdAt).getTime() - parseDatabaseDate(first.createdAt).getTime()) <=
    MESSAGE_GROUP_WINDOW_MS
  );
}

export function buildChatTimeline(messages: ChatMessageView[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
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
  }).sort((a, b) => parseDatabaseDate(a.createdAt).getTime() - parseDatabaseDate(b.createdAt).getTime());

  const days = new Map<string, { source: ChatMessageView; messages: ChatMessageView[] }>();
  for (const message of messages) {
    const dayKey = dayKeyFromIso(message.createdAt);
    if (!days.has(dayKey)) days.set(dayKey, { source: message, messages: [] });
  }
  for (const message of visibleMessages) {
    days.get(dayKeyFromIso(message.createdAt))?.messages.push(message);
  }

  const orderedDays = [...days].sort(([left], [right]) => {
    const a = left.split("-").map(Number);
    const b = right.split("-").map(Number);
    return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
  });

  for (const [dayKey, day] of orderedDays) {
    const roomSummary = roomSummaries.get(dayKey);
    if (!day.messages.length && !roomSummary?.sessions) continue;
    const label = formatMessageDateLabel(day.source.createdAt);
    items.push({ type: "date", key: `date-${dayKey}`, label });
    if (roomSummary?.sessions) {
      items.push({ type: "roomSummary", key: `room-summary-${dayKey}`, dayLabel: label, ...roomSummary });
    }
    for (const [index, message] of day.messages.entries()) {
      const joinsPrevious = messagesBelongTogether(day.messages[index - 1], message);
      const joinsNext = messagesBelongTogether(message, day.messages[index + 1]);
      const groupPosition = joinsPrevious
        ? joinsNext ? "middle" : "end"
        : joinsNext ? "start" : "only";
      items.push({ type: "message", message, groupPosition });
    }
  }

  return items;
}
