"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Bell } from "lucide-react";

import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useRealtimeInbox } from "@/hooks/useRealtimeChat";
import { trpc } from "@/lib/trpc/client";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";

import { ChatListView } from "./ChatListView";
import { GroupChatCreator } from "./GroupChatCreator";

type ChatListProps = {
  activeChatId?: string | null;
  savedMessagesActive?: boolean;
};

export function ChatList({
  activeChatId = null,
  savedMessagesActive = false,
}: ChatListProps) {
  const router = useRouter();
  const { onlineUserIds } = useOnlineUsers();
  const utils = trpc.useUtils();
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  useRealtimeInbox(me?.id);
  const { data, isLoading, error } = trpc.chat.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });
  const openDirect = trpc.chat.openDirect.useMutation();
  const savedMessages = trpc.savedMessages.availability.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const searchContacts = useCallback(
    async (query: string) => {
      const contacts = await utils.client.chat.contacts.query({ q: query.trim() });
      return contacts.filter((contact) => contact.id !== me?.id);
    },
    [me?.id, utils.client],
  );
  return (
    <ChatListView
      chats={data ?? []}
      activeChatId={activeChatId}
      loading={isLoading}
      error={error?.message}
      headerAction={(
        <span className="flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative grid h-9 w-9 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
            aria-label="Уведомления"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <NotificationNavBadge className="right-0 top-0" />
          </Link>
          <GroupChatCreator variant="compact" />
        </span>
      )}
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
      searchContacts={searchContacts}
      openContact={async (contact) => {
        const result = await openDirect.mutateAsync({ username: contact.username });
        await utils.chat.list.invalidate();
        router.push(`/messages/${result.chatId}`);
      }}
      renderContactAvatar={(contact) => (
        <ProfileAvatar
          displayName={contact.displayName}
          size="sm"
          isOnline={onlineUserIds.has(contact.id)}
          animatedAvatarUrl={contact.avatarUrl}
        />
      )}
      renderContactTitle={(contact) => (
        <DisplayNameWithPin
          hasVooplePlus={contact.hasVooplePlus}
          size="sm"
          className="min-w-0 font-medium"
        >
          {contact.displayName}
        </DisplayNameWithPin>
      )}
      renderGlobalSearchAction={(query) => (
        <Link href={`/explore?q=${encodeURIComponent(query)}`} className="voople-link mt-3 inline-flex font-medium">
          Искать «{query}» во всём Voople →
        </Link>
      )}
      savedMessagesActive={savedMessagesActive}
      renderSavedMessagesDestination={
        savedMessages.data?.enabled
          ? ({ className, children }) => (
              <Link href="/messages/saved" className={className}>
                {children}
              </Link>
            )
          : undefined
      }
    />
  );
}
