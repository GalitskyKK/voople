import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { ChatListView } from "@/components/chat/ChatListView";
import { MessagesLayoutView } from "@/components/chat/MessagesLayoutView";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import type { ChatListItem } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { DesktopGroupChatCreatorAdapter } from "./DesktopGroupChatCreatorAdapter";
import { DesktopChatThreadAdapter } from "./DesktopChatThreadAdapter";
import { useDesktopChats } from "../chat/useDesktopChats";
import { useDesktopPresence } from "../providers/DesktopPresenceProvider";
import { useConversationExit } from "@/hooks/useConversationExit";
import { trpc } from "@/lib/trpc/client";
import { SavedMessagesController } from "@/components/chat/SavedMessagesController";

export function DesktopMessagesAdapter({
  activeChatId,
  savedMessagesActive,
  initialGroupTab,
  config,
  session,
  navigate,
}: {
  activeChatId: string | null;
  savedMessagesActive: boolean;
  initialGroupTab: "chat" | "now" | "people";
  config: DesktopConfig;
  session: Session;
  navigate: (href: string) => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const searchContacts = useCallback(
    async (query: string) => {
      const contacts = (await client.query("chat.contacts", {
        q: query.trim(),
      })) as UserSearchHit[];
      return contacts.filter((contact) => contact.id !== session.user.id);
    },
    [client, session.user.id],
  );
  const onlineUserIds = useDesktopPresence();
  const { chats, error, loading, refresh } = useDesktopChats();
  const savedMessages = trpc.savedMessages.availability.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const badgeUrl = vooplusBadgeUrl(config.assetsCdnUrl);
  const activeRootChat: ChatListItem | null = activeChatId
    ? chats.find(
        (chat) =>
          chat.id === activeChatId ||
          chat.channels.some((section) => section.id === activeChatId),
      ) ?? null
    : null;

  useConversationExit({
    active: Boolean(activeChatId) || savedMessagesActive,
    onExit: () => navigate("/messages"),
  });

  return (
    <MessagesLayoutView
      isThread={Boolean(activeChatId) || savedMessagesActive}
      list={
        <ChatListView
          chats={chats}
          activeChatId={activeChatId}
          loading={loading}
          error={error}
          headerAction={
            <DesktopGroupChatCreatorAdapter
              config={config}
              session={session}
              onCreated={(chatId) => {
                void refresh();
                navigate(`/messages/${chatId}`);
              }}
            />
          }
          emptyAction={
            <button
              type="button"
              className="voople-link mt-3 inline-flex text-sm font-medium"
              onClick={() => navigate("/explore")}
            >
              Найти людей
            </button>
          }
          renderDestination={({ chat, className, children }) => (
            <button
              type="button"
              className={className}
              onClick={() => navigate(`/messages/${chat.id}`)}
            >
              {children}
            </button>
          )}
          renderAvatar={(chat, title) => (
            <ProfileAvatar
              displayName={title}
              size="sm"
              animatedAvatarUrl={chat.otherUser?.avatarUrl}
              decorationUrl={chat.otherUser?.avatarDecorationUrl}
              ringId={chat.otherUser?.avatarRingId}
              isOnline={Boolean(
                chat.otherUser?.id &&
                  onlineUserIds.has(chat.otherUser.id),
              )}
            />
          )}
          renderTitle={(chat, title) => (
            <span className="inline-flex min-w-0 items-center gap-1 font-medium">
              <span className="min-w-0 truncate">{title}</span>
              {chat.otherUser?.hasVooplePlus ? (
                <img
                  src={badgeUrl}
                  alt="Вупл+"
                  className="voople-plus-pin__image h-[18px] w-[18px] shrink-0 object-contain"
                />
              ) : null}
            </span>
          )}
          searchContacts={searchContacts}
          openContact={async (contact) => {
            const result = (await client.mutation("chat.openDirect", {
              username: contact.username,
            })) as { chatId: string };
            await refresh();
            navigate(`/messages/${result.chatId}`);
          }}
          renderContactAvatar={(contact) => (
            <ProfileAvatar
              displayName={contact.displayName}
              size="sm"
              animatedAvatarUrl={contact.avatarUrl}
              isOnline={onlineUserIds.has(contact.id)}
            />
          )}
          renderContactTitle={(contact) => (
            <span className="inline-flex min-w-0 items-center gap-1 font-medium">
              <span className="min-w-0 truncate">{contact.displayName}</span>
              {contact.hasVooplePlus ? (
                <img
                  src={badgeUrl}
                  alt="Вупл+"
                  className="voople-plus-pin__image h-[18px] w-[18px] shrink-0 object-contain"
                />
              ) : null}
            </span>
          )}
          renderGlobalSearchAction={(query) => (
            <button type="button" className="voople-link mt-3 font-medium" onClick={() => navigate("/explore")}>
              Искать «{query}» во всём Voople →
            </button>
          )}
          savedMessagesActive={savedMessagesActive}
          renderSavedMessagesDestination={
            savedMessages.data?.enabled
              ? ({ className, children }) => (
                  <button
                    type="button"
                    className={className}
                    onClick={() => navigate("/messages/saved")}
                  >
                    {children}
                  </button>
                )
              : undefined
          }
        />
      }
      thread={
        savedMessagesActive ? (
          <SavedMessagesController onBack={() => navigate("/messages")} />
        ) : activeChatId ? (
          <DesktopChatThreadAdapter
            key={activeChatId}
            chatId={activeChatId}
            rootChat={activeRootChat}
            initialGroupTab={initialGroupTab}
            config={config}
            session={session}
            onBack={() => navigate("/messages")}
            onInboxChange={refresh}
            onNavigateChat={(chatId) => navigate(`/messages/${chatId}`)}
            onNavigateProfile={(username) => navigate(`/${username}`)}
            onOpenGroupSettings={(chatId) => navigate(`/messages/${chatId}/settings`)}
            onlineUserIds={onlineUserIds}
          />
        ) : null
      }
    />
  );
}
