"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useChatMessageEditor } from "@/hooks/useChatMessageEditor";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useChatMessageSelection } from "@/hooks/useChatMessageSelection";
import { useChatConversationAttention } from "@/hooks/useChatConversationAttention";
import { useChatSendMutation } from "@/hooks/useChatSendMutation";
import { useChatMessageActions } from "@/hooks/useChatMessageActions";
import type { PendingChatUpload } from "@/hooks/useChatUpload";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";
import { parseComposerContent } from "@/lib/chat/message-content";
import { Toast } from "@/components/ui/Toast";
import { ChatComposer } from "./ChatComposer";
import { ChatTrackMetadataDialog } from "./ChatTrackMetadataDialog";
import { ChatMediaLightbox } from "./ChatMediaLightbox";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatThreadFrameView } from "./ChatThreadFrameView";
import { ChatWindowHeader } from "./ChatWindowHeader";
import { ChatSectionsBar } from "./ChatSectionsBar";
import { ChatJumpToLatest } from "./ChatJumpToLatest";
import { ChatSelectionController } from "./ChatSelectionController";
import { ChatConversationStart } from "./ChatConversationStart";
type ChatWindowProps = { chatId: string; initialGroupTab?: "chat" | "now" | "people" };
export function ChatWindow({ chatId, initialGroupTab = "chat" }: ChatWindowProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingChatUpload | null>(null);
  const [pendingTrack, setPendingTrack] = useState<PlaylistTrackView | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { onlineUserIds } = useOnlineUsers();
  const actions = useChatMessageActions(chatId);
  const editor = useChatMessageEditor(chatId, setText);
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const { realtimeDegraded } = useRealtimeChat(chatId, me?.id);
  const { data, isLoading, error } = trpc.chat.observeMessages.useQuery(
    { chatId },
    {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      refetchInterval: realtimeDegraded ? 2_500 : 60_000,
    },
  );
  const isGroupChat = data?.chat.type === "group";
  const { data: groupEmojis } = trpc.chat.groupEmojis.useQuery(
    { chatId },
    { enabled: isGroupChat },
  );
  useChatConversationAttention(chatId, me?.id, text, Boolean(editor.editing), setText, data?.messages);
  const selection = useChatMessageSelection(chatId, data?.messages ?? []);
  const send = useChatSendMutation({
    chatId, viewerId: me?.id, text, replyTo, pendingUpload, pendingTrack,
    setText, setReplyTo, setPendingUpload, setPendingTrack,
  });
  const { containerRef: messagesRef, contentRef: messagesContentRef, isAwayFromBottom, scrollToBottom } =
    useChatAutoScroll(chatId, data?.messages.length ?? 0);

  const handleSend = () => {
    const trimmed = text.trim();
    if (editor.editing) {
      if (trimmed && trimmed !== editor.editing.text?.trim()) {
        editor.mutation.mutate({ messageId: editor.editing.id, text: trimmed });
      }
      return;
    }
    if (!trimmed && !pendingUpload && !pendingTrack) return;

    const isAudio = pendingUpload?.kind === "audio";
    send.mutate({
      chatId,
      messageId: crypto.randomUUID(),
      text: trimmed || undefined,
      content: groupEmojis?.items.length && trimmed
        ? parseComposerContent(trimmed, groupEmojis.items)
        : undefined,
      mediaKey: pendingUpload?.mediaKey,
      mediaTitle: isAudio ? pendingUpload?.title : undefined,
      mediaArtist: isAudio ? pendingUpload?.artist : undefined,
      sharedTrackId: pendingTrack?.id,
      replyToMessageId: replyTo?.id,
    });
  };

  if (isLoading) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 flex-col justify-center">
        <p className="text-sm text-red-400">{error.message}</p>
      </div>
    );
  }

  const other = data?.otherUser;
  const isGroup = data?.chat.type === "group";
  const isSubchat = Boolean(data?.chat.parentChatId);
  const chatTitle = isGroup ? data?.chat.name || "Группа" : other?.displayName || "Чат";
  const timeline = buildChatTimeline(data?.messages ?? []);
  const viewerId = me?.id ?? null;
  const otherOnline = Boolean(other?.id && onlineUserIds.has(other.id));
  return (
    <ChatThreadFrameView
      accentColor={isGroup ? data?.chat.groupAccentColor : null}
      groupSurface={isGroup ? {
        groupId: data?.chat.parentChatId ?? chatId,
        groupName: data?.chat.parentName ?? chatTitle,
        initialTab: initialGroupTab,
        canCreatePinned: data?.chat.viewerRole !== "member", onlineUserIds,
        onOpenProfile: (username) => router.push(`/${username}`),
      } : undefined}
      header={selection.selecting ? (
        <ChatSelectionController messages={selection.selectedMessages} onCancel={selection.clear} onDeleteMessage={(messageId) => actions.removeMessage.mutateAsync({ messageId })} />
      ) : <ChatWindowHeader
        chatId={chatId}
        chatTitle={chatTitle}
        isGroup={isGroup}
        isSubchat={isSubchat}
        parentChatId={data?.chat.parentChatId}
        parentName={data?.chat.parentName}
        memberCount={data?.chat.memberCount ?? 0}
        topicIcon={data?.chat.topicIcon ?? null}
        groupIcon={data?.chat.groupIcon ?? null}
        groupAvatarUrl={data?.chat.groupAvatarUrl ?? null}
        groupBannerUrl={data?.chat.groupBannerUrl ?? null}
        groupAccentColor={data?.chat.groupAccentColor ?? null}
        groupTag={data?.chat.groupTag ?? null}
        viewerRole={data?.chat.viewerRole ?? "member"}
        other={other}
        otherOnline={otherOnline}
      />}
      sections={isGroup ? (
        <ChatSectionsBar chatId={chatId} viewerRole={data?.chat.viewerRole ?? "member"} />
      ) : null}
      timeline={timeline}
      emptyState={
        <ChatConversationStart
          chatTitle={chatTitle}
          isGroup={isGroup}
          isSubchat={isSubchat}
          parentName={data?.chat.parentName}
          memberCount={data?.chat.memberCount ?? 0}
          topicIcon={data?.chat.topicIcon}
          groupIcon={data?.chat.groupIcon}
          groupAvatarUrl={data?.chat.groupAvatarUrl}
          groupAccentColor={data?.chat.groupAccentColor}
          other={other}
          otherOnline={otherOnline}
        />
      }
      messagesRef={messagesRef}
      messagesContentRef={messagesContentRef}
      renderMessage={(item) => (
        <ChatMessageBubble
          key={item.message.id}
          message={item.message}
          selectionMode={selection.selecting}
          selected={selection.selectedIds.has(item.message.id)}
          onSelect={(message) => selection.toggle(message.id)}
          groupPosition={item.groupPosition}
          viewerId={viewerId}
          onReply={setReplyTo}
          onEdit={(message) => {
            setReplyTo(null);
            setPendingUpload(null);
            setPendingTrack(null);
            editor.beginEditing(message);
          }}
          onDelete={(message) => {
            if (window.confirm("Удалить сообщение?")) actions.removeMessage.mutate({ messageId: message.id });
          }}
          onAddToPlaylist={actions.setPlaylistConfirmMessage}
          onOpenImage={setLightboxUrl}
          showSender={isGroup}
          onToggleReaction={(message, reaction) =>
            actions.toggleMessageReaction(message.id, {
              emoji: reaction.emoji,
              emojiId: reaction.emojiId ?? null,
            })}
        />
      )}
      afterMessages={isAwayFromBottom ? <ChatJumpToLatest onClick={scrollToBottom} /> : null}
      composer={
        <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-4 lg:pb-3">
        <ChatComposer
          chatId={chatId}
          text={text}
          onTextChange={setText}
          replyTo={replyTo}
          editing={editor.editing}
          onReplyCancel={() => setReplyTo(null)}
          onEditCancel={() => {
            editor.cancelEditing();
          }}
          pendingUpload={pendingUpload}
          onPendingUploadChange={setPendingUpload}
          pendingTrack={pendingTrack}
          onPendingTrackChange={setPendingTrack}
          onSend={handleSend}
          isSending={send.isPending || editor.mutation.isPending}
          customEmojis={groupEmojis?.items ?? []}
        />
        </div>
      }
      overlays={
        <>
          <ChatMediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
          {actions.playlistConfirmMessage && actions.playlistDefaults ? (
            <ChatTrackMetadataDialog
              open
              initialTitle={actions.playlistDefaults.title}
              initialArtist={actions.playlistDefaults.artist}
              isSubmitting={actions.addToPlaylist.isPending}
              error={actions.addToPlaylist.error?.message ?? null}
              onClose={() => actions.setPlaylistConfirmMessage(null)}
              onConfirm={(draft) =>
                actions.addToPlaylist.mutate({
                  messageId: actions.playlistConfirmMessage!.id,
                  title: draft.title,
                  artist: draft.artist,
                })
              }
            />
          ) : null}
          {actions.toast ? <Toast message={actions.toast} className="z-[130]" /> : null}
        </>
      }
    />
  );
}
