"use client";

import type { ReactNode } from "react";

import type { ChatListItem } from "@/types/chat";

import type { ChatSectionDestinationRenderer } from "./chat-section-destination";
import { ChatSectionPicker } from "./ChatSectionPicker";

export function ChatSectionsBarView({
  rootChat,
  activeChatId,
  renderDestination,
  createAction,
}: {
  rootChat: ChatListItem;
  activeChatId: string;
  renderDestination: ChatSectionDestinationRenderer;
  createAction?: ReactNode;
}) {
  if (!rootChat.topicsEnabled) return null;
  const sections = [rootChat, ...rootChat.channels];
  const activeSection = sections.find((section) => section.id === activeChatId) ?? rootChat;

  return (
    <nav
      className="voople-chat-sections flex min-h-11 shrink-0 items-center gap-1 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 lg:min-h-9"
      aria-label="Разделы группы"
    >
      <ChatSectionPicker
        sections={sections}
        activeSection={activeSection}
        rootChatId={rootChat.id}
        renderDestination={renderDestination}
      />

      {createAction ? <div className="ml-auto flex min-h-9 shrink-0 items-center">{createAction}</div> : null}
    </nav>
  );
}
