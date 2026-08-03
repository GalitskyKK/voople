"use client";

import { useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { messageHasMusicForPlaylist } from "@/lib/chat/playlist-from-message";
import type { ChatReactionEmoji } from "@/lib/chat/reactions";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";

import { ChatAttachmentAudio } from "./ChatAttachmentAudio";
import { ChatAttachmentCircle } from "./ChatAttachmentCircle";
import { ChatAttachmentImage } from "./ChatAttachmentImage";
import { ChatAttachmentTrack } from "./ChatAttachmentTrack";
import { ChatMessageBubbleVisual } from "./ChatMessageBubbleVisual";
import { ChatMessageMenu } from "./ChatMessageMenu";

type ChatMessageBubbleProps = {
  message: ChatMessageView;
  viewerId: string | null;
  onReply?: (message: ChatMessageView) => void;
  onDelete?: (message: ChatMessageView) => void;
  onAddToPlaylist?: (message: ChatMessageView) => void;
  onOpenImage?: (url: string) => void;
  showSender?: boolean;
  onToggleReaction?: (
    message: ChatMessageView,
    emoji: ChatReactionEmoji,
  ) => void;
  groupPosition?: "only" | "start" | "middle" | "end";
};

export function ChatMessageBubble({
  message,
  viewerId,
  onReply,
  onDelete,
  onAddToPlaylist,
  onOpenImage,
  showSender = false,
  onToggleReaction,
  groupPosition = "only",
}: ChatMessageBubbleProps) {
  const isLg = useIsLgViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMine, attachment } = message;
  const canSaveToPlaylist = Boolean(
    viewerId && onAddToPlaylist && messageHasMusicForPlaylist(message),
  );
  const hasMenu = Boolean(
    onReply ||
      onToggleReaction ||
      (isMine && onDelete) ||
      (canSaveToPlaylist && onAddToPlaylist),
  );

  const openMenu = () => {
    if (hasMenu) setMenuOpen(true);
  };

  return (
    <ChatMessageBubbleVisual
      message={message}
      groupPosition={groupPosition}
      showSender={showSender}
      interactive={hasMenu}
      onClick={() => {
        if (!isLg) openMenu();
      }}
      onContextMenu={(event) => {
        if (!hasMenu) return;
        event.preventDefault();
        setMenuOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMenu();
        }
      }}
      onToggleReaction={
        onToggleReaction
          ? (emoji) =>
              onToggleReaction(message, emoji as ChatReactionEmoji)
          : undefined
      }
      senderAvatar={
        showSender && !isMine && message.sender ? (
          <ProfileAvatar
            displayName={message.sender.displayName}
            size="sm"
            animatedAvatarUrl={message.sender.avatarUrl}
            className="mb-0.5 shrink-0"
          />
        ) : null
      }
      menu={
        hasMenu && onReply ? (
          <div
            className={cn(
              "absolute top-1 z-20",
              isMine ? "left-1" : "right-1",
            )}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
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
              onToggleReaction={onToggleReaction}
              showOnHover={isLg}
              showTrigger={false}
            />
          </div>
        ) : null
      }
      attachment={
        <>
          {attachment?.kind === "image" ? (
            <ChatAttachmentImage
              url={attachment.url}
              onOpen={() => onOpenImage?.(attachment.url)}
            />
          ) : null}
          {attachment?.kind === "audio" ? (
            <ChatAttachmentAudio
              messageId={message.id}
              url={attachment.url}
              title={attachment.title}
              artist={attachment.artist}
              audioKind={attachment.audioKind}
              isMine={isMine}
            />
          ) : null}
          {attachment?.kind === "circle" ? (
            <ChatAttachmentCircle url={attachment.url} />
          ) : null}
          {attachment?.kind === "track" ? (
            <ChatAttachmentTrack
              messageId={message.id}
              attachment={attachment}
              isMine={isMine}
            />
          ) : null}
        </>
      }
    />
  );
}
