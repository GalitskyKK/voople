"use client";

import { useChatOpenedTelemetry } from "./useChatOpenedTelemetry";
import { useLocalChatDraft } from "./useLocalChatDraft";

export function useChatConversationAttention(
  chatId: string,
  accountId: string | null | undefined,
  text: string,
  editing: boolean,
  onRestore: (text: string) => void,
) {
  useChatOpenedTelemetry(chatId);
  useLocalChatDraft({ accountId, chatId, text, editing, onRestore });
}
