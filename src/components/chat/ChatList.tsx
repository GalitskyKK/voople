"use client";

import Link from "next/link";

import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useRealtimeInbox } from "@/hooks/useRealtimeChat";
import { trpc } from "@/lib/trpc/client";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";

import { ChatListView } from "./ChatListView";
import { GroupChatCreator } from "./GroupChatCreator";

type ChatListProps = {
  activeChatId?: string | null;
};

export function ChatList({ activeChatId = null }: ChatListProps) {
  const { onlineUserIds } = useOnlineUsers();
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  useRealtimeInbox(me?.id);
  const { data, isLoading, error } = trpc.chat.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  return (
    <ChatListView
      chats={data ?? []}
      activeChatId={activeChatId}
      loading={isLoading}
      error={error?.message}
      headerAction={<GroupChatCreator compact />}
      emptyAction={
        <Link
          href="/explore"
          className="voople-link mt-3 inline-flex text-sm font-medium"
        >
          Найти людей
        </Link>
      }
      renderDestination={({ chat, className, children }) => (
        <Link href={`/messages/${chat.id}`} className={className}>
          {children}
        </Link>
      )}
      renderAvatar={(chat, title) => (
        <ProfileAvatar
          displayName={title}
          size="sm"
          isOnline={Boolean(
            chat.otherUser?.id && onlineUserIds.has(chat.otherUser.id),
          )}
          animatedAvatarUrl={chat.otherUser?.avatarUrl}
          decorationUrl={chat.otherUser?.avatarDecorationUrl}
          ringId={chat.otherUser?.avatarRingId}
        />
      )}
      renderTitle={(chat, title) => (
        <DisplayNameWithPin
          hasVooplePlus={chat.otherUser?.hasVooplePlus}
          size="sm"
          className="min-w-0 font-medium"
        >
          {title}
        </DisplayNameWithPin>
      )}
    />
  );
}
