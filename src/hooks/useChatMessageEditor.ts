"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { ChatMessageView } from "@/types/chat";

export function useChatMessageEditor(
  chatId: string,
  setText: (value: string) => void,
) {
  const [editing, setEditing] = useState<ChatMessageView | null>(null);
  const utils = trpc.useUtils();
  const mutation = trpc.chat.editMessage.useMutation({
    onSuccess: (updated) => {
      utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.map((message) =>
          message.id === updated.id ? { ...updated, sender: message.sender } : message,
        ),
      } : current);
      setEditing(null);
      setText("");
      void utils.chat.list.invalidate();
    },
  });

  const beginEditing = (message: ChatMessageView) => {
    setEditing(message);
    setText(message.text ?? "");
  };
  const cancelEditing = () => {
    setEditing(null);
    setText("");
  };

  return { editing, beginEditing, cancelEditing, mutation };
}
