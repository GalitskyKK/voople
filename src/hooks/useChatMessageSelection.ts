"use client";

import { useCallback, useMemo, useState } from "react";

import type { ChatMessageView } from "@/types/chat";

const EMPTY_SELECTION = new Set<string>();

export function useChatMessageSelection(chatId: string, messages: ChatMessageView[]) {
  const [selection, setSelection] = useState<{ chatId: string; ids: Set<string> }>(
    () => ({ chatId, ids: new Set() }),
  );
  const selectedIds = selection.chatId === chatId ? selection.ids : EMPTY_SELECTION;

  const toggle = useCallback((messageId: string) => {
    setSelection((current) => {
      const next = new Set(current.chatId === chatId ? current.ids : []);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return { chatId, ids: next };
    });
  }, [chatId]);

  const clear = useCallback(() => setSelection({ chatId, ids: new Set() }), [chatId]);
  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedIds.has(message.id)),
    [messages, selectedIds],
  );

  return {
    clear,
    selectedIds,
    selectedMessages,
    selecting: selectedIds.size > 0,
    toggle,
  };
}
