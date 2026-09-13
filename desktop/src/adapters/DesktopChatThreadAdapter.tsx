import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, Hash } from "lucide-react";
import { useEffect, useState } from "react";

import { ChatSectionsBarView } from "@/components/chat/ChatSectionsBarView";
import { ChatThreadFrameView } from "@/components/chat/ChatThreadFrameView";
import { ChatWindowHeaderVisual } from "@/components/chat/ChatWindowHeaderVisual";
import { ChatPeerPresence } from "@/components/chat/ChatPeerPresence";
import { GroupInfoDrawerView } from "@/components/chat/GroupInfoDrawerView";
import { GroupRoomAction } from "@/components/chat/GroupRoomAction";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ChatMediaLightbox } from "@/components/chat/ChatMediaLightbox";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatConversationStart } from "@/components/chat/ChatConversationStart";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import type { ChatListItem, GroupEmojiView } from "@/types/chat";
import { ChatConversationState } from "@/components/chat/ChatConversationState";
import { useChatComposerSession } from "@/components/chat/ChatComposerSessionProvider";

import type { DesktopConfig } from "../config";
import { DesktopChatComposerAdapter } from "./DesktopChatComposerAdapter";
import { DesktopChatRoomHeaderAction } from "./DesktopChatRoomHeaderAction";
import { useDesktopGroupPanel } from "./useDesktopGroupPanel";
import { DesktopSectionAccessAdapter } from "./DesktopSectionAccessAdapter";
import { DesktopSubchatCreatorAdapter } from "./DesktopSubchatCreatorAdapter";
import { useDesktopChatThread } from "../chat/useDesktopChatThread";
import { createDesktopTrpcClient } from "../api/trpc";

export function DesktopChatThreadAdapter({
  chatId,
  rootChat,
  initialGroupTab,
  config,
  session,
  onBack,
  onInboxChange,
  onNavigateChat,
  onNavigateProfile,
  onOpenGroupSettings,
  onlineUserIds,
}: {
  chatId: string;
  rootChat: ChatListItem | null;
  initialGroupTab: "chat" | "now" | "people";
  config: DesktopConfig;
  session: Session;
  onBack: () => void;
  onInboxChange: () => void;
  onNavigateChat: (chatId: string) => void;
  onNavigateProfile: (username: string) => void;
  onOpenGroupSettings: (chatId: string) => void;
  onlineUserIds: ReadonlySet<string>;
}) {
  const {
    data,
    deleteMessage,
    editMessage,
    error,
    loading,
    retry,
    sendMessage,
    sending,
    toggleReaction,
  } = useDesktopChatThread(config, session, chatId, onInboxChange);
  const {
    replyTo,
    setText, setReplyTo, setEditing, setPendingTrack,
    discardPendingUpload,
  } = useChatComposerSession(chatId);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [groupEmojis, setGroupEmojis] = useState<GroupEmojiView[]>([]);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const online = useBrowserOnline();
  const groupPanel = useDesktopGroupPanel({
    chatId,
    config,
    enabled: data?.chat.type === "group",
    session,
  });
  const { containerRef: messagesRef, contentRef: messagesContentRef } =
    useChatAutoScroll(chatId, data?.messages.length ?? 0);

  useEffect(() => {
    if (data?.chat.type !== "group") return;
    let active = true;
    const client = createDesktopTrpcClient(config, () => session.access_token);
    void client.query("chat.groupEmojis", { chatId }).then((value) => {
      if (active) setGroupEmojis((value as { items: GroupEmojiView[] }).items);
    }).catch(() => { if (active) setGroupEmojis([]); });
    return () => { active = false; };
  }, [chatId, config, data?.chat.type, session.access_token]);

  if (!data) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 flex-col">
        <ChatConversationState
          mode={!online ? "offline" : loading ? "loading" : "error"}
          message={!online || loading ? null : error}
          onRetry={retry}
        />
      </div>
    );
  }

  const isGroup = data.chat.type === "group";
  const other = data.otherUser;
  const title = isGroup
    ? data.chat.name || "Группа"
    : other?.displayName || "Чат";
  const timeline = buildChatTimeline(data.messages);
  const isSubchat = Boolean(data.chat.parentChatId);

  return (
    <ChatThreadFrameView
      accentColor={isGroup ? data.chat.groupAccentColor : null}
      groupSurface={isGroup ? {
        groupId: rootChat?.id ?? data.chat.parentChatId ?? chatId,
        conversationId: chatId,
        groupName: rootChat?.name ?? data.chat.parentName ?? title,
        initialTab: initialGroupTab,
        combineHeader: !isSubchat,
        canCreatePinned: data.chat.viewerRole !== "member",
        onlineUserIds, onOpenProfile: onNavigateProfile,
      } : undefined}
      header={<ChatWindowHeaderVisual
        className={isGroup && !isSubchat ? "voople-chat-window__header--group" : undefined}
      >
        <button
          type="button"
          onClick={() =>
            data.chat.parentChatId
              ? onNavigateChat(data.chat.parentChatId)
              : onBack()
          }
          className="shrink-0 rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] lg:hidden"
          aria-label="К списку сообщений"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isGroup && !isSubchat ? (
          <GroupInfoDrawerView
            open={groupPanel.open}
            tab={groupPanel.tab}
            chatName={title}
            memberCount={data.chat.memberCount}
            groupIcon={data.chat.groupIcon}
            groupAvatarUrl={data.chat.groupAvatarUrl}
            groupBannerUrl={data.chat.groupBannerUrl}
            groupAccentColor={data.chat.groupAccentColor}
            groupTag={data.chat.groupTag}
            groupTagEquipped={groupPanel.community?.tagEquippedByMe}
            groupTagPending={groupPanel.tagPending}
            canManage={data.chat.viewerRole !== "member"}
            description={groupPanel.community?.description}
            members={groupPanel.members}
            onlineUserIds={onlineUserIds}
            roomParticipantIds={groupPanel.roomParticipantIds}
            infoLoading={groupPanel.loading && groupPanel.tab === "info"}
            membersLoading={groupPanel.loading && groupPanel.tab === "members"}
            error={groupPanel.error}
            topics={groupPanel.topicNames}
            sections={rootChat?.channels.map((section) => ({ id: section.id, name: section.name || "Раздел" })) ?? []}
            roomAction={(
              <GroupRoomAction
                groupId={chatId}
                groupName={title}
                canCreatePinned={data.chat.viewerRole !== "member"}
                display="label"
                onBeforeOpen={() => groupPanel.setOpen(false)}
                onOpenProfile={onNavigateProfile}
              />
            )}
            onOpenChange={(open) => {
              groupPanel.setOpen(open);
              if (open) groupPanel.load();
            }}
            onTabChange={(tab) => {
              groupPanel.setTab(tab);
              groupPanel.load();
            }}
            onManage={() => {
              groupPanel.setOpen(false);
              onOpenGroupSettings(chatId);
            }}
            onInvite={() => {
              groupPanel.setOpen(false);
              onOpenGroupSettings(chatId);
            }}
            onOpenSection={(sectionId) => {
              groupPanel.setOpen(false);
              onNavigateChat(sectionId);
            }}
            onOpenProfile={(username) => {
              groupPanel.setOpen(false);
              onNavigateProfile(username);
            }}
            onToggleGroupTag={() => void groupPanel.toggleProfileTag()}
          />
        ) : isSubchat ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
            {data.chat.topicIcon ? (
              <span aria-hidden="true">{data.chat.topicIcon}</span>
            ) : (
              <Hash className="h-4 w-4" />
            )}
          </span>
        ) : other ? (
          <button
            type="button"
            onClick={() => onNavigateProfile(other.username)}
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
            aria-label={`Открыть профиль ${other.displayName}`}
          >
            <ProfileAvatar
              displayName={other.displayName}
              size="sm"
              animatedAvatarUrl={other.avatarUrl}
              decorationUrl={other.avatarDecorationUrl}
              ringId={other.avatarRingId}
              isOnline={onlineUserIds.has(other.id)}
            />
          </button>
        ) : null}
        {isGroup && !isSubchat ? null : <div className="min-w-0 flex-1">
          {isGroup ? (
            <p className="truncate font-semibold">
              {isSubchat && data.chat.parentName
                ? `${data.chat.parentName} / ${title}`
                : title}
            </p>
          ) : other ? (
            <button
              type="button"
              onClick={() => onNavigateProfile(other.username)}
              className="max-w-full text-left"
            >
              <DisplayNameWithPin
                hasVooplePlus={other.hasVooplePlus}
                className="max-w-full font-semibold"
              >
                {other.displayName}
              </DisplayNameWithPin>
            </button>
          ) : (
            <p className="truncate font-semibold">{title}</p>
          )}
          {isGroup ? (
            <p className="truncate text-xs text-[var(--app-muted)]">
              {isSubchat
                ? `Раздел · ${data.chat.memberCount} участников`
                : `${data.chat.memberCount} участников`}
            </p>
          ) : other ? (
            <button
              type="button"
              onClick={() => onNavigateProfile(other.username)}
              className="block max-w-full truncate text-xs text-[var(--app-muted)] hover:text-[var(--foreground)]"
            >
              <ChatPeerPresence
                isOnline={onlineUserIds.has(other.id)}
                lastSeenAt={other.lastSeenAt}
                username={other.username}
              />
            </button>
          ) : null}
        </div>}
        {isSubchat &&
        data.chat.parentChatId &&
        data.chat.viewerRole !== "member" ? (
          <DesktopSectionAccessAdapter
            chatId={chatId}
            parentChatId={data.chat.parentChatId}
            config={config}
            session={session}
            onChanged={() => {
              onInboxChange();
              retry();
            }}
          />
        ) : null}
        <DesktopChatRoomHeaderAction
          chatId={chatId}
          chatName={title}
          chatType={isGroup ? "group" : "direct"}
          isRootGroup={isGroup && !isSubchat}
          canCreatePinned={data.chat.viewerRole !== "member"}
          onOpenProfile={onNavigateProfile}
        />
      </ChatWindowHeaderVisual>}
      sections={rootChat ? (
        <ChatSectionsBarView
          rootChat={rootChat}
          activeChatId={chatId}
          createAction={({ open, onOpenChange }) => (
            <DesktopSubchatCreatorAdapter
              parentChatId={rootChat.id}
              config={config}
              session={session}
              viewerRole={data.chat.viewerRole}
              open={open}
              onOpenChange={onOpenChange}
              onCreated={(createdChatId) => {
                onInboxChange();
                onNavigateChat(createdChatId);
              }}
            />
          )}
          pendingFavoriteId={pendingFavoriteId}
          favoriteError={favoriteError}
          onToggleFavorite={async (sectionId) => {
            setPendingFavoriteId(sectionId);
            setFavoriteError(null);
            try {
              const client = createDesktopTrpcClient(
                config,
                () => session.access_token,
              );
              await client.mutation("chat.toggleSectionFavorite", { sectionId });
              onInboxChange();
            } catch (error) {
              setFavoriteError(
                error instanceof Error
                  ? error.message
                  : "Не удалось обновить избранное",
              );
            } finally {
              setPendingFavoriteId(null);
            }
          }}
          renderDestination={(chat, className, children, onNavigate) => (
            <button
              key={chat.id}
              type="button"
              className={className}
              onClick={() => {
                onNavigate?.();
                onNavigateChat(chat.id);
              }}
            >
              {children}
            </button>
          )}
        />
      ) : null}
      timeline={timeline}
      emptyState={
        <ChatConversationStart
          chatTitle={title}
          isGroup={isGroup}
          isSubchat={isSubchat}
          parentName={data.chat.parentName}
          memberCount={data.chat.memberCount}
          topicIcon={data.chat.topicIcon}
          groupIcon={data.chat.groupIcon}
          groupAvatarUrl={data.chat.groupAvatarUrl}
          groupAccentColor={data.chat.groupAccentColor}
          other={other}
          otherOnline={Boolean(other && onlineUserIds.has(other.id))}
        />
      }
      messagesRef={messagesRef}
      messagesContentRef={messagesContentRef}
      renderMessage={(item) => (
        <ChatMessageBubble
          key={item.message.id}
          message={item.message}
          viewerId={session.user.id}
          groupPosition={item.groupPosition}
          showSender
          onReply={setReplyTo}
          onEdit={(message) => {
            setReplyTo(null);
            discardPendingUpload();
            setPendingTrack(null);
            setEditing(message);
            setText(message.text ?? "");
          }}
          onDelete={(message) => {
            if (replyTo?.id === message.id) setReplyTo(null);
            void deleteMessage(message.id);
          }}
          onToggleReaction={(message, emoji) =>
            void toggleReaction(message.id, emoji)
          }
          onOpenImage={setLightboxUrl}
        />
      )}
      connectionState={!online ? (
        <ChatConversationState mode="offline" variant="inline" onRetry={retry} />
      ) : error ? (
        <ChatConversationState mode="error" variant="inline" message={error} onRetry={retry} />
      ) : null}
      composer={<DesktopChatComposerAdapter
        chatId={chatId}
        placeholder={`Сообщение ${title}…`}
        config={config}
        session={session}
        sending={sending}
        onSend={sendMessage}
        onEdit={editMessage}
        customEmojis={data.chat.type === "group" ? groupEmojis : []}
      />}
      overlays={<ChatMediaLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />}
    />
  );
}
