"use client";

import type { ChatMessageView } from "@/types/chat";

import { useChatReadReceipt } from "./useChatReadReceipt";
import { useChatOpenedTelemetry } from "./useChatOpenedTelemetry";
import { useLocalChatDraft } from "./useLocalChatDraft";

export function useChatConversationAttention(
  chatId: string,
  accountId: string | null | undefined,
  text: string,
  editing: boolean,
  onRestore: (text: string) => void,
  messages?: readonly ChatMessageView[],
) {
  useChatOpenedTelemetry(chatId);
  useLocalChatDraft({ accountId, chatId, text, editing, onRestore });
  useChatReadReceipt(chatId, messages);
}
