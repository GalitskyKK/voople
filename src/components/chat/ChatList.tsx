"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useRealtimeInbox } from "@/hooks/useRealtimeChat";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { UsersRound } from "lucide-react";
import { GroupChatCreator } from "./GroupChatCreator";

type ChatListProps = {
  activeChatId?: string | null;
};

export function ChatList({ activeChatId = null }: ChatListProps) {
  const pathname = usePathname();
  const { onlineUserIds } = useOnlineUsers();
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  useRealtimeInbox(me?.id);

  const { data, isLoading, error } = trpc.chat.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error.message}</p>;
  }

  if (!data?.length) {
    return (
      <><GroupChatCreator /><p className="text-sm text-[var(--app-muted)]">Пока нет диалогов. Найдите человека в поиске и нажмите «Написать» на профиле.</p></>
    );
  }

  return (
    <><GroupChatCreator /><ul className="voople-chat-list space-y-1">
      {data.map((chat) => {
        const isGroup = chat.type === "group";
        const title = isGroup ? chat.name || "Группа" : chat.otherUser?.displayName ?? "Чат";
        const preview = chat.lastMessage?.text?.trim() || (chat.lastMessage ? "Вложение" : "Нет сообщений");
        const isActive = activeChatId === chat.id || pathname === `/messages/${chat.id}`;
        const isOnline = Boolean(chat.otherUser?.id && onlineUserIds.has(chat.otherUser.id));

        return (
          <li key={chat.id}>
            <Link
              href={`/messages/${chat.id}`}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                isActive
                  ? "bg-[var(--app-accent-soft)]"
                  : "hover:bg-[var(--app-surface-soft)]",
              )}
            >
              {isGroup ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)"><UsersRound className="h-4 w-4" /></span> : <ProfileAvatar displayName={title} size="sm" isOnline={isOnline} />}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <DisplayNameWithPin
                    hasVooplePlus={chat.otherUser?.hasVooplePlus}
                    size="sm"
                    className="min-w-0 font-medium"
                  >
                    {title}
                  </DisplayNameWithPin>
                  {chat.lastMessage && (
                    <RelativeTime
                      iso={chat.lastMessage.createdAt}
                      className="shrink-0 text-xs text-[var(--app-muted)]"
                    />
                  )}
                </div>
                <p className="truncate text-xs text-[var(--app-muted)]">{isGroup ? `${chat.memberCount} участников` : `@${chat.otherUser?.username}`}</p>
                <p className="mt-0.5 truncate text-sm text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">
                  {preview}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul></>
  );
}
