"use client";

import { useMemo, useState } from "react";

import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import { buildOptimisticMessage } from "@/lib/chat/optimistic-message";
import type { PendingChatUpload } from "@/hooks/useChatUpload";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";
import type {
  SavedMessageDraft,
  SavedMessageView,
} from "@/types/saved-messages";

import { ChatComposer } from "./ChatComposer";
import { ChatJumpToLatest } from "./ChatJumpToLatest";
import { ChatMediaLightbox } from "./ChatMediaLightbox";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatThreadFrameView } from "./ChatThreadFrameView";
import { SavedMessagesEmptyState } from "./SavedMessagesEmptyState";
import { SavedMessagesHeader } from "./SavedMessagesHeader";

function toChatMessage(message: SavedMessageView, ownerId: string): ChatMessageView {
  return {
    id: message.id,
    senderId: ownerId,
    text: message.text,
    createdAt: message.createdAt,
    isMine: true,
    readAt: message.createdAt,
    replyTo: message.replyTo ? {
      id: message.replyTo.id,
      senderId: ownerId,
      text: message.replyTo.text,
      isMine: true,
    } : null,
    attachment: message.attachment,
    reactions: [],
  };
}

export function SavedMessagesView({
  ownerId,
  messages,
  loading,
  error,
  online,
  query,
  hasNextPage,
  loadingMore,
  onQueryChange,
  onRetry,
  onLoadMore,
  onCreate,
  onEdit,
  onDelete,
  onBack,
}: {
  ownerId: string;
  messages: SavedMessageView[];
  loading: boolean;
  error?: string | null;
  online: boolean;
  query: string;
  hasNextPage: boolean;
  loadingMore: boolean;
  onQueryChange: (value: string) => void;
  onRetry: () => Promise<unknown>;
  onLoadMore: () => Promise<unknown>;
  onCreate: (
    draft: SavedMessageDraft,
    optimistic: SavedMessageView,
  ) => Promise<unknown>;
  onEdit: (messageId: string, text: string) => Promise<unknown>;
  onDelete: (messageId: string) => Promise<unknown>;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [editing, setEditing] = useState<ChatMessageView | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingChatUpload | null>(null);
  const [pendingTrack, setPendingTrack] = useState<PlaylistTrackView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const threadMessages = useMemo(
    () => [...messages].reverse().map((message) => toChatMessage(message, ownerId)),
    [messages, ownerId],
  );
  const timeline = buildChatTimeline(threadMessages);
  const { containerRef, contentRef, isAwayFromBottom, scrollToBottom } =
    useChatAutoScroll(`saved:${query}`, threadMessages.length);

  const clearDraft = () => {
    if (pendingUpload?.previewUrl) URL.revokeObjectURL(pendingUpload.previewUrl);
    setText("");
    setReplyTo(null);
    setEditing(null);
    setPendingUpload(null);
    setPendingTrack(null);
  };
  const submit = async () => {
    const trimmed = text.trim();
    if (!online || pending) return;
    if (!editing && !trimmed && !pendingUpload && !pendingTrack) return;
    setPending(true);
    setActionError(null);
    try {
      if (editing) {
        await onEdit(editing.id, trimmed);
      } else {
        const messageId = crypto.randomUUID();
        const isAudio = pendingUpload?.kind === "audio";
        const draft = {
          messageId,
          text: trimmed || undefined,
          mediaKey: pendingUpload?.mediaKey,
          mediaTitle: isAudio ? pendingUpload?.title : undefined,
          mediaArtist: isAudio ? pendingUpload?.artist : undefined,
          sharedTrackId: pendingTrack?.id,
          replyToMessageId: replyTo?.id,
        } satisfies SavedMessageDraft;
        const optimisticChatMessage = buildOptimisticMessage({
          messageId,
          senderId: ownerId || "me",
          text: trimmed || undefined,
          replyTo,
          pendingUpload,
          pendingTrack,
        });
        await onCreate(draft, {
          id: messageId,
          text: optimisticChatMessage.text,
          createdAt: optimisticChatMessage.createdAt,
          editedAt: null,
          replyTo: optimisticChatMessage.replyTo
            ? {
                id: optimisticChatMessage.replyTo.id,
                text: optimisticChatMessage.replyTo.text,
              }
            : null,
          attachment: optimisticChatMessage.attachment ?? null,
        });
      }
      clearDraft();
    } catch (submitError) {
      setActionError(
        submitError instanceof Error ? submitError.message : "Не удалось сохранить сообщение",
      );
    } finally {
      setPending(false);
    }
  };

  if (loading && messages.length === 0) {
    return <div className="min-h-0 flex-1 animate-pulse bg-[var(--app-surface-soft)]" aria-label="Загружаем избранное" />;
  }

  return (
    <ChatThreadFrameView
      header={<SavedMessagesHeader query={query} onQueryChange={onQueryChange} onBack={onBack} />}
      timeline={timeline}
      messagesRef={containerRef}
      messagesContentRef={contentRef}
      beforeMessages={error || hasNextPage ? (
        <div className="mb-3 flex justify-center gap-2">
          {error && online ? (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="rounded-[var(--app-radius-md)] px-3 py-2 text-xs font-medium text-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]"
            >
              Повторить
            </button>
          ) : null}
          {hasNextPage ? (
            <button
              type="button"
              disabled={loadingMore || !online}
              onClick={() => void onLoadMore()}
              className="rounded-[var(--app-radius-md)] px-3 py-2 text-xs font-medium text-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)] disabled:opacity-50"
            >
              {loadingMore ? "Загружаем…" : "Показать более ранние"}
            </button>
          ) : null}
        </div>
      ) : null}
      emptyState={<SavedMessagesEmptyState searching={Boolean(query.trim())} />}
      renderMessage={(item) => (
        <ChatMessageBubble
          key={item.message.id}
          message={item.message}
          viewerId={ownerId}
          groupPosition={item.groupPosition}
          onReply={(message) => {
            setEditing(null);
            setText("");
            setReplyTo(message);
          }}
          onEdit={(message) => {
            setReplyTo(null);
            setPendingUpload(null);
            setPendingTrack(null);
            setEditing(message);
            setText(message.text ?? "");
          }}
          onDelete={(message) => {
            if (!window.confirm("Удалить сообщение из избранного?")) return;
            setActionError(null);
            void onDelete(message.id).catch((deleteError) => setActionError(
              deleteError instanceof Error ? deleteError.message : "Не удалось удалить сообщение",
            ));
          }}
          onOpenImage={setLightboxUrl}
        />
      )}
      afterMessages={isAwayFromBottom ? <ChatJumpToLatest onClick={scrollToBottom} /> : null}
      error={!online ? "Нет сети. Черновик останется на месте — отправьте его после подключения." : actionError ?? error}
      composer={(
        <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
          <ChatComposer
            chatId="saved-messages"
            uploadChatId={null}
            text={text}
            onTextChange={setText}
            replyTo={replyTo}
            editing={editing}
            onReplyCancel={() => setReplyTo(null)}
            onEditCancel={() => {
              setEditing(null);
              setText("");
            }}
            pendingUpload={pendingUpload}
            onPendingUploadChange={setPendingUpload}
            pendingTrack={pendingTrack}
            onPendingTrackChange={setPendingTrack}
            onSend={() => void submit()}
            isSending={pending}
            disabled={!online}
          />
        </div>
      )}
      overlays={<ChatMediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    />
  );
}
