import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { ChatListView } from "@/components/chat/ChatListView";
import { MessagesLayoutView } from "@/components/chat/MessagesLayoutView";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import type { ChatListItem } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { DesktopChatAvatar } from "./DesktopChatAvatar";
import { DesktopGroupChatCreator } from "./DesktopGroupChatCreator";
import { DesktopChatThread } from "./DesktopChatThread";
import { useDesktopChats } from "./useDesktopChats";

export function DesktopMessages({
  activeChatId,
  config,
  session,
  navigate,
}: {
  activeChatId: string | null;
  config: DesktopConfig;
  session: Session;
  navigate: (href: string) => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const searchContacts = useCallback(
    async (query: string) =>
      (await client.query("chat.contacts", { q: query })) as UserSearchHit[],
    [client],
  );
  const { chats, error, loading, onlineUserIds, refresh } = useDesktopChats(
    config,
    session,
  );
  const badgeUrl = vooplusBadgeUrl(config.assetsCdnUrl);
  const activeRootChat: ChatListItem | null = activeChatId
    ? chats.find(
        (chat) =>
          chat.id === activeChatId ||
          chat.channels.some((section) => section.id === activeChatId),
      ) ?? null
    : null;

  return (
    <MessagesLayoutView
      isThread={Boolean(activeChatId)}
      listHeader={
        <SectionPageHeader
          title="Сообщения"
          variant="plain"
          className="border-b-0 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-4"
        />
      }
      list={
        <ChatListView
          chats={chats}
          activeChatId={activeChatId}
          loading={loading}
          error={error}
          headerAction={
            <DesktopGroupChatCreator
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
            <DesktopChatAvatar
              displayName={title}
              avatarUrl={chat.otherUser?.avatarUrl}
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
                  alt="Voople+"
                  className="h-[18px] w-[18px] shrink-0 object-contain"
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
            <DesktopChatAvatar
              displayName={contact.displayName}
              avatarUrl={contact.avatarUrl}
              isOnline={onlineUserIds.has(contact.id)}
            />
          )}
          renderContactTitle={(contact) => (
            <span className="inline-flex min-w-0 items-center gap-1 font-medium">
              <span className="min-w-0 truncate">{contact.displayName}</span>
              {contact.hasVooplePlus ? (
                <img
                  src={badgeUrl}
                  alt="Voople+"
                  className="h-[18px] w-[18px] shrink-0 object-contain"
                />
              ) : null}
            </span>
          )}
        />
      }
      thread={
        activeChatId ? (
          <DesktopChatThread
            key={activeChatId}
            chatId={activeChatId}
            rootChat={activeRootChat}
            config={config}
            session={session}
            onBack={() => navigate("/messages")}
            onInboxChange={refresh}
            onNavigateChat={(chatId) => navigate(`/messages/${chatId}`)}
            onNavigateProfile={(username) => navigate(`/${username}`)}
            onlineUserIds={onlineUserIds}
          />
        ) : null
      }
    />
  );
}
