"use client";

import { GripVertical, MessageSquareText, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatConversationState } from "@/components/chat/ChatConversationState";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatThreadFrameView } from "@/components/chat/ChatThreadFrameView";
import { IconButton } from "@/components/ui/IconButton";
import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useChatConversationAttention } from "@/hooks/useChatConversationAttention";
import { useChatSendMutation } from "@/hooks/useChatSendMutation";
import type { PendingChatUpload } from "@/hooks/useChatUpload";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { parseComposerContent } from "@/lib/chat/message-content";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageRoomContext, ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

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
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingChatUpload | null>(null);
  const [pendingTrack, setPendingTrack] = useState<PlaylistTrackView | null>(null);
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
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
    false,
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
              onReplyCancel={() => setReplyTo(null)}
              pendingUpload={pendingUpload}
              onPendingUploadChange={setPendingUpload}
              pendingTrack={pendingTrack}
              onPendingTrackChange={setPendingTrack}
              onSend={handleSend}
              isSending={send.isPending}
              disabled={!online || Boolean(messagesQuery.error)}
              customEmojis={groupEmojis.data?.items ?? []}
            />
          </div>
        )}
      />
    </aside>
  );
}
