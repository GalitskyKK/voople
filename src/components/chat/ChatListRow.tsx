"use client";

import { UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";

export type ChatListDestinationRenderer = (input: {
  chat: ChatListItem;
  className: string;
  children: ReactNode;
}) => ReactNode;

export function ChatListRow({
  chat,
  activeChatId,
  renderDestination,
  renderAvatar,
  renderTitle,
}: {
  chat: ChatListItem;
  activeChatId: string | null;
  renderDestination: ChatListDestinationRenderer;
  renderAvatar: (chat: ChatListItem, title: string) => ReactNode;
  renderTitle?: (chat: ChatListItem, title: string) => ReactNode;
}) {
  const isGroup = chat.type === "group";
  const title = isGroup
    ? chat.name || "Группа"
    : chat.otherUser?.displayName ?? "Чат";
  const preview =
    chat.lastMessage?.text?.trim() ||
    (chat.lastMessage ? "Вложение" : "Нет сообщений");
  const isActive =
    activeChatId === chat.id ||
    chat.channels.some((section) => section.id === activeChatId);

  return (
    <li>
      {renderDestination({
        chat,
        className: cn(
          "voople-chat-list__row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          isActive
            ? "bg-[var(--app-accent-soft)]"
            : "hover:bg-[var(--app-surface-soft)]",
        ),
        children: (
          <>
            {isGroup ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
                <UsersRound className="h-4 w-4" />
              </span>
            ) : (
              renderAvatar(chat, title)
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                {renderTitle ? (
                  renderTitle(chat, title)
                ) : (
                  <span className="min-w-0 truncate font-medium">{title}</span>
                )}
                {chat.lastMessage ? (
                  <RelativeTime
                    iso={chat.lastMessage.createdAt}
                    className="shrink-0 text-xs text-[var(--app-muted)]"
                  />
                ) : null}
              </div>
              <p className="truncate text-xs text-[var(--app-muted)]">
                {isGroup
                  ? `${chat.memberCount} участников${chat.channels.length ? ` · ${chat.channels.length} разделов` : ""}`
                  : `@${chat.otherUser?.username ?? ""}`}
              </p>
              <p className="mt-0.5 truncate text-sm text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">
                {preview}
              </p>
            </div>
          </>
        ),
      })}

    </li>
  );
}
