"use client";

import { Hash, UsersRound } from "lucide-react";
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
  normalizedQuery,
  renderDestination,
  renderAvatar,
  renderTitle,
}: {
  chat: ChatListItem;
  activeChatId: string | null;
  normalizedQuery: string;
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
  const rootMatchesQuery =
    !normalizedQuery ||
    [chat.name, chat.lastMessage?.text]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery);
  const channels = rootMatchesQuery
    ? chat.channels
    : chat.channels.filter((channel) =>
        [channel.name, channel.lastMessage?.text]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ru-RU")
          .includes(normalizedQuery),
      );

  return (
    <li>
      {renderDestination({
        chat,
        className: cn(
          "voople-chat-list__row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          activeChatId === chat.id
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
                  ? `${chat.memberCount} участников${chat.channels.length ? ` · ${chat.channels.length} тем` : ""}`
                  : `@${chat.otherUser?.username ?? ""}`}
              </p>
              <p className="mt-0.5 truncate text-sm text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">
                {preview}
              </p>
            </div>
          </>
        ),
      })}

      {channels.length ? (
        <ul
          className={cn(
            chat.topicsLayout === "tabs"
              ? "voople-scroll ml-3 mt-1 flex gap-1 overflow-x-auto pb-1"
              : "ml-6 mt-0.5 space-y-0.5 border-l border-[var(--app-border)] pl-2",
          )}
        >
          {channels.map((channel) => {
            const channelPreview =
              channel.lastMessage?.text?.trim() ||
              (channel.lastMessage ? "Вложение" : "Нет сообщений");
            return (
              <li key={channel.id}>
                {renderDestination({
                  chat: channel,
                  className: cn(
                    "voople-chat-list__channel flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                    chat.topicsLayout === "tabs" ? "w-max shrink-0" : "w-full",
                    activeChatId === channel.id
                      ? "bg-[var(--app-accent-soft)] text-[var(--foreground)]"
                      : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
                  ),
                  children: (
                    <>
                      {channel.topicIcon ? (
                        <span className="shrink-0 text-sm" aria-hidden="true">
                          {channel.topicIcon}
                        </span>
                      ) : (
                        <Hash className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {channel.name || "Тема"}
                          </span>
                          {channel.lastMessage ? (
                            <RelativeTime
                              iso={channel.lastMessage.createdAt}
                              className="shrink-0 text-[10px] text-[var(--app-muted)]"
                            />
                          ) : null}
                        </div>
                        {chat.topicsLayout === "list" ? (
                          <p className="truncate text-xs opacity-75">
                            {channelPreview}
                          </p>
                        ) : null}
                      </div>
                    </>
                  ),
                })}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
