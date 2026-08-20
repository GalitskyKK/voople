"use client";

import type { ReactNode } from "react";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";

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
    chat.lastMessage?.preview ||
    (chat.lastMessage ? "Вложение" : "Нет сообщений");
  const isActive =
    activeChatId === chat.id ||
    chat.channels.some((section) => section.id === activeChatId);

  return (
    <li
      style={
        isGroup && chat.groupAccentColor
          ? ({ "--group-accent": chat.groupAccentColor } as React.CSSProperties)
          : undefined
      }
    >
      {renderDestination({
        chat,
        className: cn(
          "voople-chat-list__row flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
          isActive
            ? isGroup
              ? "voople-chat-list__row--active bg-[color-mix(in_srgb,var(--group-accent,var(--theme-accent))_14%,var(--app-surface-soft))] shadow-[inset_3px_0_0_var(--group-accent,var(--theme-accent))]"
              : "voople-chat-list__row--active bg-[var(--app-accent-soft)]"
            : "hover:bg-[var(--app-surface-soft)]",
        ),
        children: (
          <>
            {isGroup ? (
              <GroupAvatar
                name={title}
                avatarUrl={chat.groupAvatarUrl}
                icon={chat.groupIcon}
                accentColor={chat.groupAccentColor}
              />
            ) : (
              renderAvatar(chat, title)
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                {renderTitle ? (
                  renderTitle(chat, title)
                ) : (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate font-medium">{title}</span>
                    {isGroup && chat.groupTag ? <span className="shrink-0 rounded bg-[color-mix(in_srgb,var(--group-accent,var(--theme-accent))_14%,var(--app-surface-soft))] px-1 py-0.5 text-[9px] font-bold tracking-wide text-[var(--group-accent,var(--theme-accent))]">{chat.groupTag}</span> : null}
                  </span>
                )}
                {chat.lastMessage ? (
                  <RelativeTime
                    iso={chat.lastMessage.createdAt}
                    className="shrink-0 text-xs text-[var(--app-muted)]"
                  />
                ) : null}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-[color-mix(in_srgb,var(--foreground)_68%,transparent)]">
                  {preview}
                </p>
                {isGroup && !chat.lastMessage ? (
                  <span className="shrink-0 text-[11px] text-[var(--app-muted)]">
                    {chat.memberCount} участников
                  </span>
                ) : null}
              </div>
            </div>
          </>
        ),
      })}

    </li>
  );
}
