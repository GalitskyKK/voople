"use client";

import { useState } from "react";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useChatMessageEditor } from "@/hooks/useChatMessageEditor";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useChatMessageSelection } from "@/hooks/useChatMessageSelection";
import type { PendingChatUpload } from "@/hooks/useChatUpload";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import { trpc } from "@/lib/trpc/client";
import { buildOptimisticMessage } from "@/lib/chat/optimistic-message";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";
import type { ChatReactionEmoji } from "@/lib/chat/reactions";
import { playlistMetadataDefaultsFromMessage } from "@/lib/chat/playlist-from-message";
import { Toast } from "@/components/ui/Toast";
import { ChatComposer } from "./ChatComposer";
import { ChatTrackMetadataDialog } from "./ChatTrackMetadataDialog";
import { ChatDateDivider } from "./ChatDateDivider";
import { ChatMediaLightbox } from "./ChatMediaLightbox";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatWindowHeader } from "./ChatWindowHeader";
import { ChatSectionsBar } from "./ChatSectionsBar";
import { ChatJumpToLatest } from "./ChatJumpToLatest";
import { ChatSelectionController } from "./ChatSelectionController";
type ChatWindowProps = {
  chatId: string;
};

export function ChatWindow({ chatId }: ChatWindowProps) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingChatUpload | null>(null);
  const [pendingTrack, setPendingTrack] = useState<PlaylistTrackView | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [playlistConfirmMessage, setPlaylistConfirmMessage] = useState<ChatMessageView | null>(
    null,
  );
  const { onlineUserIds } = useOnlineUsers();
  const utils = trpc.useUtils();
  const editor = useChatMessageEditor(chatId, setText);

  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const { realtimeDegraded } = useRealtimeChat(chatId, me?.id);

  const { data, isLoading, error } = trpc.chat.getMessages.useQuery(
    { chatId },
    {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      refetchInterval: realtimeDegraded ? 2_500 : 60_000,
    },
  );
  const selection = useChatMessageSelection(chatId, data?.messages ?? []);

  const send = trpc.chat.send.useMutation({
    onMutate: async (input) => {
      await utils.chat.getMessages.cancel({ chatId });
      const prev = utils.chat.getMessages.getData({ chatId });
      const replyMessage = input.replyToMessageId
        ? prev?.messages.find((m) => m.id === input.replyToMessageId) ?? replyTo
        : null;

      const optimistic = buildOptimisticMessage({
        messageId: input.messageId,
        senderId: me?.id ?? "me",
        text: input.text,
        replyTo: replyMessage,
        pendingUpload,
        pendingTrack,
      });

      utils.chat.getMessages.setData({ chatId }, (current) =>
        current?.messages.some((message) => message.id === optimistic.id)
          ? current
          : current
            ? { ...current, messages: [...current.messages, optimistic] }
            : {
                messages: [optimistic],
                otherUser: null,
                chat: {
                  id: chatId,
                  type: "direct",
                  name: null,
                  parentChatId: null,
                  topicsEnabled: false,
                  topicsLayout: "list",
                  topicIcon: null,
                  groupVisibility: "private",
                  sectionAccessMode: "inherit",
                  groupIcon: null,
                  groupAvatarUrl: null,
                  groupAccentColor: null,
                  boostCount: 0,
                  boostedByMe: false,
                  memberCount: 0,
                  viewerRole: "member",
                },
              },
      );

      setText("");
      setReplyTo(null);
      setPendingUpload(null);
      setPendingTrack(null);
      return { prev, previewUrl: pendingUpload?.previewUrl ?? null };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) {
        utils.chat.getMessages.setData({ chatId }, ctx.prev);
      }
      if (ctx?.previewUrl) URL.revokeObjectURL(ctx.previewUrl);
    },
    onSuccess: (msg, _input, ctx) => {
      utils.chat.getMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        const messages = current.messages.map((m) => (m.id === msg.id ? msg : m));
        if (messages.some((m) => m.id === msg.id)) return { ...current, messages };
        return { ...current, messages: [...messages, msg] };
      });
      void utils.chat.list.invalidate();
      if (ctx?.previewUrl) URL.revokeObjectURL(ctx.previewUrl);
    },
  });

  const { containerRef: messagesRef, contentRef: messagesContentRef, isAwayFromBottom, scrollToBottom } =
    useChatAutoScroll(chatId, data?.messages.length ?? 0);

  const removeMessage = trpc.chat.deleteMessage.useMutation({
    onSuccess: (_data, variables) => {
      utils.chat.getMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        return {
          ...current,
          messages: current.messages.filter((m) => m.id !== variables.messageId),
        };
      });
      void utils.chat.list.invalidate();
    },
    onError: (err) => {
      setToast(err.message);
      window.setTimeout(() => setToast(null), 3500);
    },
  });

  const addToPlaylist = trpc.playlist.addFromChatMessage.useMutation({
    onSuccess: () => {
      setPlaylistConfirmMessage(null);
      setToast("Добавлено в плейлист");
      void utils.playlist.listMine.invalidate();
      window.setTimeout(() => setToast(null), 2500);
    },
    onError: (err) => {
      setToast(err.message);
      window.setTimeout(() => setToast(null), 3500);
    },
  });

  const toggleReaction = trpc.chat.toggleReaction.useMutation({
    onMutate: async ({ messageId, emoji }) => {
      await utils.chat.getMessages.cancel({ chatId });
      const previous = utils.chat.getMessages.getData({ chatId });
      utils.chat.getMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        return {
          ...current,
          messages: current.messages.map((message) => {
            if (message.id !== messageId) return message;
            const reactions = [...message.reactions];
            const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
            if (index < 0) {
              reactions.push({ emoji, count: 1, reactedByMe: true });
            } else {
              const reaction = reactions[index]!;
              if (reaction.reactedByMe && reaction.count <= 1) reactions.splice(index, 1);
              else reactions[index] = {
                ...reaction,
                count: reaction.count + (reaction.reactedByMe ? -1 : 1),
                reactedByMe: !reaction.reactedByMe,
              };
            }
            return { ...message, reactions };
          }),
        };
      });
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) utils.chat.getMessages.setData({ chatId }, context.previous);
      setToast(error.message);
      window.setTimeout(() => setToast(null), 3000);
    },
    onSuccess: (result) => {
      utils.chat.getMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.map((message) => message.id === result.messageId
          ? { ...message, reactions: result.reactions }
          : message),
      } : current);
    },
  });

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
  const playlistDefaults = playlistConfirmMessage
    ? playlistMetadataDefaultsFromMessage(playlistConfirmMessage)
    : null;

  return (
    <div className="voople-chat-window flex min-h-0 flex-1 flex-col">
      {selection.selecting ? (
        <ChatSelectionController messages={selection.selectedMessages} onCancel={selection.clear} onDeleteMessage={(messageId) => removeMessage.mutateAsync({ messageId })} />
      ) : <ChatWindowHeader
        chatId={chatId}
        chatTitle={chatTitle}
        isGroup={isGroup}
        isSubchat={isSubchat}
        parentChatId={data?.chat.parentChatId}
        parentName={data?.chat.parentName}
        memberCount={data?.chat.memberCount ?? 0}
        topicsEnabled={data?.chat.topicsEnabled ?? false}
        topicsLayout={data?.chat.topicsLayout ?? "list"}
        topicIcon={data?.chat.topicIcon ?? null}
        groupVisibility={data?.chat.groupVisibility ?? "private"}
        groupIcon={data?.chat.groupIcon ?? null}
        groupAvatarUrl={data?.chat.groupAvatarUrl ?? null}
        groupAccentColor={data?.chat.groupAccentColor ?? null}
        viewerRole={data?.chat.viewerRole ?? "member"}
        other={other}
        otherOnline={otherOnline}
      />}
      {isGroup ? <ChatSectionsBar chatId={chatId} /> : null}

      <div
        ref={messagesRef}
        data-voople-scroll=""
        className="voople-chat-window__messages voople-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 py-3"
      >
        {timeline.length === 0 && (
          <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">Напишите первое сообщение</p>
        )}
        <div ref={messagesContentRef} className="mx-auto flex w-full flex-col gap-0.5 px-2">
          {timeline.map((item) =>
            item.type === "date" ? (
              <ChatDateDivider key={item.key} label={item.label} />
            ) : (
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
                onDelete={(msg) => {
                  if (window.confirm("Удалить сообщение?")) removeMessage.mutate({ messageId: msg.id });
                }}
                onAddToPlaylist={(msg) => setPlaylistConfirmMessage(msg)}
                onOpenImage={setLightboxUrl}
                showSender={isGroup}
                onToggleReaction={(message, emoji: ChatReactionEmoji) => {
                  if (!toggleReaction.isPending) toggleReaction.mutate({ messageId: message.id, emoji });
                }}
              />
            ),
          )}
        </div>
        {isAwayFromBottom ? <ChatJumpToLatest onClick={scrollToBottom} /> : null}
      </div>

      <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-4 lg:pb-3">
        <ChatComposer
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
        />
      </div>

      <ChatMediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      {playlistConfirmMessage && playlistDefaults && (
        <ChatTrackMetadataDialog
          open
          initialTitle={playlistDefaults.title}
          initialArtist={playlistDefaults.artist}
          isSubmitting={addToPlaylist.isPending}
          error={addToPlaylist.error?.message ?? null}
          onClose={() => setPlaylistConfirmMessage(null)}
          onConfirm={(draft) =>
            addToPlaylist.mutate({
              messageId: playlistConfirmMessage.id,
              title: draft.title,
              artist: draft.artist,
            })
          }
        />
      )}
      {toast && <Toast message={toast} className="z-[130]" />}
    </div>
  );
}
