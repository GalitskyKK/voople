"use client";

import { Hash } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";

export function ChatSectionsBarView({
  rootChat,
  activeChatId,
  renderDestination,
}: {
  rootChat: ChatListItem;
  activeChatId: string;
  renderDestination: (
    chat: ChatListItem,
    className: string,
    children: ReactNode,
  ) => ReactNode;
}) {
  if (!rootChat.topicsEnabled) return null;
  const sections = [rootChat, ...rootChat.channels];

  return (
    <nav
      className="voople-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5"
      aria-label="Разделы группы"
    >
      {sections.map((section, index) =>
        renderDestination(
          section,
          cn(
            "inline-flex h-8 max-w-52 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition",
            activeChatId === section.id
              ? "bg-[var(--app-accent-soft)] text-(--theme-accent)"
              : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
          ),
          <>
            {index === 0 ? (
              <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : section.topicIcon ? (
              <span aria-hidden="true">{section.topicIcon}</span>
            ) : (
              <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{index === 0 ? "Общий" : section.name || "Раздел"}</span>
          </>,
        ),
      )}
    </nav>
  );
}
