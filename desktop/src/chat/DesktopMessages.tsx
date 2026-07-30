import type { Session } from "@supabase/supabase-js";

import { ChatListView } from "@/components/chat/ChatListView";
import { MessagesLayoutView } from "@/components/chat/MessagesLayoutView";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";

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
  const { chats, error, loading, onlineUserIds, refresh } = useDesktopChats(
    config,
    session,
  );
  const badgeUrl = vooplusBadgeUrl(config.assetsCdnUrl);

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
        />
      }
      thread={
        activeChatId ? (
          <DesktopChatThread
            key={activeChatId}
            chatId={activeChatId}
            config={config}
            session={session}
            onBack={() => navigate("/messages")}
            onInboxChange={refresh}
            onlineUserIds={onlineUserIds}
          />
        ) : null
      }
    />
  );
}
