"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";

import {
  ChatSectionIcon,
  type ChatSectionDestinationRenderer,
} from "./chat-section-destination";
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
  const shortcuts = rootChat.topicsLayout === "tabs"
    ? sections.filter((section) => section.id !== activeSection.id).slice(0, 2)
    : [];

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

      <div className="hidden min-w-0 items-stretch gap-1 sm:flex">
        {shortcuts.map((section) =>
          renderDestination(
            section,
            cn(
              "voople-chat-sections__item relative inline-flex h-9 max-w-40 items-center gap-1.5 rounded-[var(--app-radius-sm)] px-2.5 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]",
            ),
            <>
              <ChatSectionIcon section={section} rootChatId={rootChat.id} />
              <span className="truncate">{section.id === rootChat.id ? "Общий" : section.name || "Раздел"}</span>
            </>,
          ),
        )}
      </div>

      {createAction ? <div className="ml-auto flex min-h-9 shrink-0 items-center">{createAction}</div> : null}
    </nav>
  );
}
