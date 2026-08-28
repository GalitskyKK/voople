import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatSectionsBarView } from "@/components/chat/ChatSectionsBarView";
import { ChatThreadFrameView } from "@/components/chat/ChatThreadFrameView";
import { ChatWindowHeaderVisual } from "@/components/chat/ChatWindowHeaderVisual";
import { ChatPeerPresence } from "@/components/chat/ChatPeerPresence";
import { GroupInfoDrawerView, type GroupInfoDrawerTab } from "@/components/chat/GroupInfoDrawerView";
import { VoiceRoomButton } from "@/components/chat/voice/VoiceRoomButton";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ChatMediaLightbox } from "@/components/chat/ChatMediaLightbox";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import type { ChatGroupMemberView, ChatListItem, ChatMessageView, GroupCommunityView, GroupEmojiView } from "@/types/chat";
import type { GroupDiscoveryProfileView, InterestCatalogView } from "@/types/social";

import type { DesktopConfig } from "../config";
import { DesktopChatComposerAdapter } from "./DesktopChatComposerAdapter";
import { DesktopSectionAccessAdapter } from "./DesktopSectionAccessAdapter";
import { DesktopSubchatCreatorAdapter } from "./DesktopSubchatCreatorAdapter";
import { useDesktopChatThread } from "../chat/useDesktopChatThread";
import { createDesktopTrpcClient } from "../api/trpc";

export function DesktopChatThreadAdapter({
  chatId,
  rootChat,
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
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [editing, setEditing] = useState<ChatMessageView | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [groupEmojis, setGroupEmojis] = useState<GroupEmojiView[]>([]);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerTab, setGroupDrawerTab] = useState<GroupInfoDrawerTab>("info");
  const [groupCommunity, setGroupCommunity] = useState<GroupCommunityView | null>(null);
  const [groupMembers, setGroupMembers] = useState<ChatGroupMemberView[]>([]);
  const [roomParticipantIds, setRoomParticipantIds] = useState<ReadonlySet<string>>(() => new Set());
  const [groupTopicNames, setGroupTopicNames] = useState<string[]>([]);
  const [groupPanelLoading, setGroupPanelLoading] = useState(false);
  const [groupTagPending, setGroupTagPending] = useState(false);
  const [groupPanelError, setGroupPanelError] = useState<string | null>(null);
  const groupRequestIdRef = useRef(0);
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

  const loadGroupPanel = () => {
    if (data?.chat.type !== "group") return;
    const requestId = ++groupRequestIdRef.current;
    setGroupPanelLoading(true);
    setGroupPanelError(null);
    const client = createDesktopTrpcClient(config, () => session.access_token);
    const request = Promise.all([
      client.query("chat.groupCommunity", { chatId }),
      client.query("chat.groupMembers", { chatId }),
      client.query("chat.room", { chatId }),
      client.query("social.groupDiscoveryProfile", { chatId }),
      client.query("social.interestCatalog"),
    ]).then(([communityValue, membersValue, roomValue, discoveryValue, catalogValue]) => {
      if (requestId !== groupRequestIdRef.current) return;
      setGroupCommunity(communityValue as GroupCommunityView);
      setGroupMembers(membersValue as ChatGroupMemberView[]);
      const room = roomValue as { participants?: Array<{ id: string }> };
      setRoomParticipantIds(new Set(room.participants?.map((participant) => participant.id) ?? []));
      const discovery = discoveryValue as GroupDiscoveryProfileView;
      const catalog = catalogValue as InterestCatalogView;
      const interests = catalog.categories.flatMap((category) => category.interests);
      setGroupTopicNames(discovery.topicSlugs.map((slug) => interests.find((interest) => interest.slug === slug)?.name ?? slug));
    });
    void request
      .catch((cause) => {
        if (requestId === groupRequestIdRef.current) setGroupPanelError(cause instanceof Error ? cause.message : "Не удалось загрузить информацию о группе");
      })
      .finally(() => {
        if (requestId === groupRequestIdRef.current) setGroupPanelLoading(false);
      });
  };

  const toggleGroupProfileTag = async () => {
    if (!groupCommunity?.effectiveTag || groupTagPending) return;
    setGroupTagPending(true);
    setGroupPanelError(null);
    try {
      const client = createDesktopTrpcClient(config, () => session.access_token);
      await client.mutation("chat.setGroupProfileTag", {
        chatId: groupCommunity.tagEquippedByMe ? null : chatId,
      });
      setGroupCommunity((current) => current ? {
        ...current,
        tagEquippedByMe: !current.tagEquippedByMe,
      } : current);
    } catch (cause) {
      setGroupPanelError(cause instanceof Error ? cause.message : "Не удалось изменить тег профиля");
    } finally {
      setGroupTagPending(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 animate-pulse bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]" />
    );
  }

  if (!data) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-400">
          {error ?? "Не удалось открыть переписку"}
        </p>
        <button type="button" className="voople-button" onClick={retry}>
          Повторить
        </button>
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
      header={<ChatWindowHeaderVisual>
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
            open={groupDrawerOpen}
            tab={groupDrawerTab}
            chatName={title}
            memberCount={data.chat.memberCount}
            groupIcon={data.chat.groupIcon}
            groupAvatarUrl={data.chat.groupAvatarUrl}
            groupBannerUrl={data.chat.groupBannerUrl}
            groupAccentColor={data.chat.groupAccentColor}
            groupTag={data.chat.groupTag}
            groupTagEquipped={groupCommunity?.tagEquippedByMe}
            groupTagPending={groupTagPending}
            canManage={data.chat.viewerRole !== "member"}
            description={groupCommunity?.description}
            members={groupMembers}
            onlineUserIds={onlineUserIds}
            roomParticipantIds={roomParticipantIds}
            infoLoading={groupPanelLoading && groupDrawerTab === "info"}
            membersLoading={groupPanelLoading && groupDrawerTab === "members"}
            error={groupPanelError}
            topics={groupTopicNames}
            sections={rootChat?.channels.map((section) => ({ id: section.id, name: section.name || "Раздел" })) ?? []}
            roomAction={roomParticipantIds.size ? <VoiceRoomButton chatId={chatId} chatName={title} chatType="group" display="label" /> : undefined}
            onOpenChange={(open) => {
              setGroupDrawerOpen(open);
              if (open) loadGroupPanel();
            }}
            onTabChange={(tab) => {
              setGroupDrawerTab(tab);
              loadGroupPanel();
            }}
            onManage={() => {
              setGroupDrawerOpen(false);
              onOpenGroupSettings(chatId);
            }}
            onInvite={() => {
              setGroupDrawerOpen(false);
              onOpenGroupSettings(chatId);
            }}
            onOpenSection={(sectionId) => {
              setGroupDrawerOpen(false);
              onNavigateChat(sectionId);
            }}
            onOpenProfile={(username) => {
              setGroupDrawerOpen(false);
              onNavigateProfile(username);
            }}
            onToggleGroupTag={() => void toggleGroupProfileTag()}
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
        <VoiceRoomButton
          chatId={chatId}
          chatName={title}
          chatType={isGroup ? "group" : "direct"}
        />
      </ChatWindowHeaderVisual>}
      sections={rootChat ? (
        <ChatSectionsBarView
          rootChat={rootChat}
          activeChatId={chatId}
          createAction={
            <DesktopSubchatCreatorAdapter
              parentChatId={rootChat.id}
              config={config}
              session={session}
              viewerRole={data.chat.viewerRole}
              onCreated={(createdChatId) => {
                onInboxChange();
                onNavigateChat(createdChatId);
              }}
            />
          }
          renderDestination={(chat, className, children) => (
            <button
              key={chat.id}
              type="button"
              className={className}
              onClick={() => onNavigateChat(chat.id)}
            >
              {children}
            </button>
          )}
        />
      ) : null}
      timeline={timeline}
      messagesRef={messagesRef}
      messagesContentRef={messagesContentRef}
      renderMessage={(item) => (
        <ChatMessageBubble
          key={item.message.id}
          message={item.message}
          viewerId={session.user.id}
          groupPosition={item.groupPosition}
          showSender={isGroup}
          onReply={setReplyTo}
          onEdit={(message) => {
            setReplyTo(null);
            setEditing(message);
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
      error={error}
      composer={<DesktopChatComposerAdapter
        chatId={chatId}
        key={editing?.id ?? "new-message"}
        config={config}
        session={session}
        replyTo={replyTo}
        editing={editing}
        sending={sending}
        onCancelReply={() => setReplyTo(null)}
        onSend={sendMessage}
        onEdit={editMessage}
        onCancelEdit={() => setEditing(null)}
        customEmojis={data.chat.type === "group" ? groupEmojis : []}
      />}
      overlays={<ChatMediaLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />}
    />
  );
}
