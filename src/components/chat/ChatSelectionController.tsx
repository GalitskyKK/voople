"use client";

import { useEffect } from "react";
import type { ChatMessageView } from "@/types/chat";

import { ChatSelectionToolbar } from "./ChatSelectionToolbar";

function selectedText(messages: ChatMessageView[]) {
  return messages
    .map((message) => message.text?.trim() || (message.attachment ? "[Вложение]" : ""))
    .filter(Boolean)
    .join("\n");
}

export function ChatSelectionController({
  messages,
  onCancel,
  onDeleteMessage,
}: {
  messages: ChatMessageView[];
  onCancel: () => void;
  onDeleteMessage: (messageId: string) => Promise<unknown>;
}) {
  const canDelete = messages.length > 0 && messages.every((message) => message.isMine);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const copy = async () => {
    const text = selectedText(messages);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    onCancel();
  };

  const remove = async () => {
    if (!canDelete) return;
    if (!window.confirm(`Удалить выбранные сообщения (${messages.length})?`)) return;
    for (const message of messages) await onDeleteMessage(message.id);
    onCancel();
  };

  return (
    <ChatSelectionToolbar
      count={messages.length}
      canDelete={canDelete}
      onCancel={onCancel}
      onCopy={() => void copy()}
      onDelete={() => void remove()}
    />
  );
}
