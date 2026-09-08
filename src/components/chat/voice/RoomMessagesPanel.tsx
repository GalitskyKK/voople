"use client";

import { MessageSquareText, RefreshCw, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatDateDivider } from "@/components/chat/ChatDateDivider";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { IconButton } from "@/components/ui/IconButton";
import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useChatSendMutation } from "@/hooks/useChatSendMutation";
import type { PendingChatUpload } from "@/hooks/useChatUpload";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { parseComposerContent } from "@/lib/chat/message-content";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageRoomContext, ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

import type { VoiceRoomMessagesModel } from "./voice-room-sheet-models";

export function RoomMessagesPanel({
  model,
  onClose,
}: {
  model: VoiceRoomMessagesModel;
  onClose: () => void;
}) {
  const online = useBrowserOnline();
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
  const roomMessages = useMemo(
    () => (messagesQuery.data?.messages ?? []).filter(
      (message) => message.roomContext?.liveSessionId === model.liveSessionId,
    ),
    [messagesQuery.data?.messages, model.liveSessionId],
  );
  const timeline = useMemo(() => buildChatTimeline(roomMessages), [roomMessages]);
  const { containerRef, contentRef } = useChatAutoScroll(
    model.liveSessionId,
    roomMessages.length,
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

  return (
    <aside className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[var(--background)] sm:relative sm:z-auto sm:w-[22rem] sm:shrink-0 sm:border-l sm:border-[var(--app-border)]" aria-label={`Сообщения комнаты ${model.roomName}`}>
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4">
        <MessageSquareText className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">Сообщения комнаты</h3>
          <p className="truncate text-[11px] text-[var(--app-muted)]">{model.roomName}</p>
        </div>
        <IconButton label="Закрыть сообщения комнаты" onClick={onClose} className="h-9 w-9">
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </header>

      <div ref={containerRef} className="voople-scroll min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div ref={contentRef} className="flex min-h-full flex-col justify-end gap-0.5">
          {!online ? (
            <RoomMessagesState icon={<WifiOff className="h-5 w-5" />} title="Нет соединения" copy="История сохранена. Новые сообщения появятся после восстановления сети." />
          ) : messagesQuery.isLoading ? (
            <RoomMessagesState title="Загружаем сообщения" copy="Открываем контекст этой комнаты…" />
          ) : messagesQuery.error ? (
            <RoomMessagesState
              icon={<RefreshCw className="h-5 w-5" />}
              title="Не удалось загрузить сообщения"
              copy="Основная история не изменилась. Повторите загрузку."
              action={<button type="button" className="mt-3 text-xs font-semibold text-[var(--theme-accent)]" onClick={() => void messagesQuery.refetch()}>Повторить</button>}
            />
          ) : timeline.length === 0 ? (
            <RoomMessagesState title="Здесь пока тихо" copy="Сообщение останется в истории группы и сохранит контекст комнаты." />
          ) : timeline.map((item) => item.type === "date" ? (
            <ChatDateDivider key={item.key} label={item.label} />
          ) : item.type === "message" ? (
            <ChatMessageBubble
              key={item.message.id}
              message={item.message}
              viewerId={me?.id ?? null}
              groupPosition={item.groupPosition}
              showSender
              onReply={setReplyTo}
            />
          ) : null)}
        </div>
      </div>

      <div className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ChatComposer
          chatId={model.chatId}
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
    </aside>
  );
}

function RoomMessagesState({
  icon,
  title,
  copy,
  action,
}: {
  icon?: ReactNode;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="m-auto max-w-64 px-4 py-8 text-center" role="status">
      {icon ? <span className="mx-auto mb-3 grid h-9 w-9 place-items-center text-[var(--app-muted)]">{icon}</span> : null}
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{copy}</p>
      {action}
    </div>
  );
}
