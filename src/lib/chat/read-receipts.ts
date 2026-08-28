import type { ChatMessageView } from "@/types/chat";

export function latestUnreadIncomingAt(
  messages: readonly ChatMessageView[] | undefined,
) {
  let latest: string | null = null;
  for (const message of messages ?? []) {
    if (message.isMine || message.readAt) continue;
    if (!latest || message.createdAt > latest) latest = message.createdAt;
  }
  return latest;
}

export function canAcknowledgeConversation() {
  return document.visibilityState === "visible" && document.hasFocus();
}
