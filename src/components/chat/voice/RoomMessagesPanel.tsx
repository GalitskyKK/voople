"use client";

import { GripVertical, MessageSquareText, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { useChatComposerSession } from "@/components/chat/ChatComposerSessionProvider";
import { ChatConversationState } from "@/components/chat/ChatConversationState";
import { ChatMediaLightbox } from "@/components/chat/ChatMediaLightbox";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatThreadFrameView } from "@/components/chat/ChatThreadFrameView";
import { IconButton } from "@/components/ui/IconButton";
import { Toast } from "@/components/ui/Toast";
import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useChatConversationAttention } from "@/hooks/useChatConversationAttention";
import { useChatMessageActions } from "@/hooks/useChatMessageActions";
import { useChatMessageEditor } from "@/hooks/useChatMessageEditor";
import { useChatSendMutation } from "@/hooks/useChatSendMutation";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { parseComposerContent } from "@/lib/chat/message-content";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageRoomContext } from "@/types/chat";

import type { VoiceRoomMessagesModel } from "./voice-room-sheet-models";
import { useRoomChatPanelWidth } from "./useRoomChatPanelWidth";

export function RoomMessagesPanel({
  model,
  onClose,
}: {
  model: VoiceRoomMessagesModel;
  onClose: () => void;
}) {
  const online = useBrowserOnline();
  const panelWidth = useRoomChatPanelWidth();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const {
    text, replyTo, editing, pendingUpload, pendingTrack,
    setText, setReplyTo, setEditing, setPendingUpload, setPendingTrack, discardPendingUpload,
  } = useChatComposerSession(model.chatId);
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const actions = useChatMessageActions(model.chatId);
  const editor = useChatMessageEditor(model.chatId, setText, editing, setEditing);
  const messagesQuery = trpc.chat.observeMessages.useQuery(
    { chatId: model.chatId },
    {
      staleTime: 2_000,
      refetchInterval: online ? 3_000 : false,
      refetchIntervalInBackground: false,
    },
  );
  const groupEmojis = trpc.chat.groupEmojis.useQuery(
    { chatId: model.chatId },
    { staleTime: 60_000 },
  );
  const optimisticRoomContext = useMemo<ChatMessageRoomContext>(() => ({
    roomId: model.roomId,
    liveSessionId: model.liveSessionId,
    roomName: model.roomName,
    roomKind: model.roomKind,
    capturedAt: new Date().toISOString(),
  }), [model.liveSessionId, model.roomId, model.roomKind, model.roomName]);
  const conversationMessages = useMemo(
    () => messagesQuery.data?.messages ?? [],
    [messagesQuery.data?.messages],
  );
  const timeline = useMemo(
    () => buildChatTimeline(conversationMessages),
    [conversationMessages],
  );
  useChatConversationAttention(
    model.chatId,
    me?.id,
    text,
    Boolean(editor.editing),
    setText,
    conversationMessages,
  );
  const { containerRef, contentRef } = useChatAutoScroll(
    model.chatId,
    conversationMessages.length,
  );
  const send = useChatSendMutation({
    chatId: model.chatId,
    viewerId: me?.id,
    text,
    replyTo,
    pendingUpload,
    pendingTrack,
    optimisticRoomContext,
    setText,
    setReplyTo,
    setPendingUpload,
    setPendingTrack,
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

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
      chatId: model.chatId,
      messageId: crypto.randomUUID(),
      text: trimmed || undefined,
      content: groupEmojis.data?.items.length && trimmed
        ? parseComposerContent(trimmed, groupEmojis.data.items)
        : undefined,
      mediaKey: pendingUpload?.mediaKey,
      mediaTitle: isAudio ? pendingUpload?.title : undefined,
      mediaArtist: isAudio ? pendingUpload?.artist : undefined,
      sharedTrackId: pendingTrack?.id,
      replyToMessageId: replyTo?.id,
    });
  };
  const conversationName = messagesQuery.data?.chat.name || "Общий";
  const audienceLabel = messagesQuery.data?.chat.parentChatId
    ? `${messagesQuery.data.chat.parentName ?? "Группа"} / ${conversationName}`
    : conversationName;

  const initialState = !messagesQuery.data ? (
    <ChatConversationState
      mode={!online ? "offline" : messagesQuery.isLoading ? "loading" : "error"}
      message={!online || messagesQuery.isLoading ? null : messagesQuery.error?.message}
      onRetry={() => void messagesQuery.refetch()}
    />
  ) : (
    <p className="pb-4 text-sm text-[var(--app-muted)]">
      Начните разговор в выбранном разделе группы
    </p>
  );

  return (
    <aside
      className="voople-room-chat-panel flex min-h-0 flex-col bg-[var(--background)]"
      style={{ "--room-chat-panel-width": `${panelWidth.width}px` } as CSSProperties}
      aria-label={`Чат группы: ${audienceLabel}`}
    >
      <button
        type="button"
        className="voople-room-chat-panel__resize"
        aria-label="Изменить ширину чата группы"
        title="Ширина чата: стрелки, Shift — крупный шаг"
        onPointerDown={panelWidth.onPointerDown}
        onPointerMove={panelWidth.onPointerMove}
        onPointerUp={panelWidth.onPointerEnd}
        onPointerCancel={panelWidth.onPointerEnd}
        onKeyDown={panelWidth.onKeyDown}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <ChatThreadFrameView
        header={(
          <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4">
            <MessageSquareText className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">Чат группы</h3>
              <p className="truncate text-[11px] text-[var(--app-muted)]">{audienceLabel}</p>
            </div>
            <IconButton label="Закрыть чат группы" onClick={onClose} className="h-9 w-9">
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </header>
        )}
        timeline={timeline}
        emptyState={initialState}
        messagesRef={containerRef}
        messagesContentRef={contentRef}
        renderMessage={(item) => (
          <ChatMessageBubble
            key={item.message.id}
            message={item.message}
            viewerId={me?.id ?? null}
            groupPosition={item.groupPosition}
            showSender
            onReply={setReplyTo}
            onEdit={(message) => {
              setReplyTo(null);
              discardPendingUpload();
              setPendingTrack(null);
              editor.beginEditing(message);
            }}
            onDelete={(message) => {
              if (!window.confirm("Удалить сообщение?")) return;
              if (replyTo?.id === message.id) setReplyTo(null);
              actions.removeMessage.mutate({ messageId: message.id });
            }}
            onOpenImage={setLightboxUrl}
            onToggleReaction={(message, reaction) =>
              actions.toggleMessageReaction(message.id, {
                emoji: reaction.emoji,
                emojiId: reaction.emojiId ?? null,
              })}
          />
        )}
        connectionState={messagesQuery.data && !online ? (
          <ChatConversationState mode="offline" variant="inline" onRetry={() => void messagesQuery.refetch()} />
        ) : messagesQuery.data && messagesQuery.error ? (
          <ChatConversationState mode="error" variant="inline" message={messagesQuery.error.message} onRetry={() => void messagesQuery.refetch()} />
        ) : null}
        composer={(
          <div className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <ChatComposer
              chatId={model.chatId}
              placeholder={`Сообщение ${audienceLabel}…`}
              text={text}
              onTextChange={setText}
              replyTo={replyTo}
              editing={editor.editing}
              onReplyCancel={() => setReplyTo(null)}
              onEditCancel={editor.cancelEditing}
              pendingUpload={pendingUpload}
              onPendingUploadChange={setPendingUpload}
              pendingTrack={pendingTrack}
              onPendingTrackChange={setPendingTrack}
              onSend={handleSend}
              isSending={send.isPending || editor.mutation.isPending}
              disabled={!online || Boolean(messagesQuery.error)}
              customEmojis={groupEmojis.data?.items ?? []}
            />
          </div>
        )}
        overlays={(
          <>
            <ChatMediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
            {actions.toast ? <Toast message={actions.toast} className="z-[210]" /> : null}
          </>
        )}
      />
    </aside>
  );
}
