"use client";

import { useState } from "react";
import { CornerDownRight } from "lucide-react";

import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { messageHasMusicForPlaylist } from "@/lib/chat/playlist-from-message";
import { formatMessageTime } from "@/lib/format/message-time";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";

import { ChatAttachmentAudio } from "./ChatAttachmentAudio";
import { ChatAttachmentImage } from "./ChatAttachmentImage";
import { ChatAttachmentTrack } from "./ChatAttachmentTrack";
import { ChatMessageMenu } from "./ChatMessageMenu";
import { MessageReadTicks } from "./MessageReadTicks";

type ChatMessageBubbleProps = {
  message: ChatMessageView;
  viewerId: string | null;
  onReply?: (message: ChatMessageView) => void;
  onDelete?: (message: ChatMessageView) => void;
  onAddToPlaylist?: (message: ChatMessageView) => void;
  onOpenImage?: (url: string) => void;
};

export function ChatMessageBubble({
  message,
  viewerId,
  onReply,
  onDelete,
  onAddToPlaylist,
  onOpenImage,
}: ChatMessageBubbleProps) {
  const isLg = useIsLgViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMine, text, createdAt, readAt, replyTo, attachment } = message;
  const timeLabel = formatMessageTime(createdAt);
  const hasText = Boolean(text?.trim());
  const canSaveToPlaylist = Boolean(
    viewerId && onAddToPlaylist && messageHasMusicForPlaylist(message),
  );
  const hasMenu = Boolean(onReply || (isMine && onDelete) || (canSaveToPlaylist && onAddToPlaylist));

  const handleBubbleClick = () => {
    if (isLg || !hasMenu) return;
    setMenuOpen(true);
  };

  return (
    <div
      className={cn(
        "voople-chat-bubble-row group/bubble flex w-full",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "voople-chat-bubble relative max-w-[min(100%,22rem)]",
          isMine ? "voople-chat-bubble--mine" : "voople-chat-bubble--theirs",
        )}
        onClick={handleBubbleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBubbleClick();
          }
        }}
        role={!isLg && hasMenu ? "button" : undefined}
        tabIndex={!isLg && hasMenu ? 0 : undefined}
      >
        {hasMenu && onReply && (
          <div
            className={cn(
              "absolute top-1 z-20",
              isMine ? "left-1" : "right-1",
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ChatMessageMenu
              message={message}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onReply={onReply}
              onDelete={onDelete}
              onAddToPlaylist={onAddToPlaylist}
              isMine={isMine}
              canAddToPlaylist={canSaveToPlaylist}
              showOnHover={isLg}
            />
          </div>
        )}

        <div
          className={cn(
            "voople-chat-bubble__body flex flex-col gap-1.5 rounded-2xl px-3 py-2 text-sm leading-relaxed",
            hasMenu && "pt-7",
            isMine
              ? "rounded-br-md bg-[color-mix(in_srgb,var(--theme-accent)_22%,var(--app-surface))] text-[var(--foreground)]"
              : "rounded-bl-md border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--foreground)]",
          )}
        >
          {replyTo && (
            <div
              className={cn(
                "voople-chat-bubble__reply flex gap-2 border-l-2 py-0.5 pl-2 text-xs",
                isMine
                  ? "border-[color-mix(in_srgb,var(--theme-accent)_65%,transparent)]"
                  : "border-[var(--theme-accent)]",
              )}
            >
              <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{replyTo.isMine ? "Вы" : "Собеседник"}</p>
                <p className="truncate text-[var(--app-muted)]">
                  {replyTo.text?.trim() || "Вложение"}
                </p>
              </div>
            </div>
          )}

          {attachment?.kind === "image" && (
            <ChatAttachmentImage
              url={attachment.url}
              onOpen={() => onOpenImage?.(attachment.url)}
            />
          )}
          {attachment?.kind === "audio" && (
            <ChatAttachmentAudio
              messageId={message.id}
              url={attachment.url}
              title={attachment.title}
              artist={attachment.artist}
              isMine={isMine}
            />
          )}
          {attachment?.kind === "track" && (
            <ChatAttachmentTrack
              messageId={message.id}
              attachment={attachment}
              isMine={isMine}
            />
          )}

          {hasText && <p className="whitespace-pre-wrap break-words">{text}</p>}

          <div className="voople-chat-bubble__meta flex items-center justify-end gap-1 text-[10px] text-[var(--app-muted)]">
            <time dateTime={createdAt}>{timeLabel}</time>
            {isMine && <MessageReadTicks readAt={readAt} />}
          </div>
        </div>
      </div>
    </div>
  );
}
