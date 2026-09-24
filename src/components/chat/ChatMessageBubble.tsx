"use client";

import { useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { useSwipeToReply } from "@/hooks/useSwipeToReply";
import { messageHasMusicForPlaylist } from "@/lib/chat/playlist-from-message";
import type { ContextMenuAnchor } from "@/lib/layout/context-menu-position";
import type { ChatReactionEmoji } from "@/lib/chat/reactions";
import type { ChatMessageView } from "@/types/chat";

import { ChatMessageAttachment } from "./ChatMessageAttachment";
import { ChatMessageBubbleVisual } from "./ChatMessageBubbleVisual";
import { ChatMessageMenu } from "./ChatMessageMenu";

type ChatMessageBubbleProps = {
  message: ChatMessageView;
  viewerId: string | null;
  onReply?: (message: ChatMessageView) => void;
  onDelete?: (message: ChatMessageView) => void;
  onEdit?: (message: ChatMessageView) => void;
  onAddToPlaylist?: (message: ChatMessageView) => void;
  onOpenImage?: (url: string) => void;
  showSender?: boolean;
  onToggleReaction?: (
    message: ChatMessageView,
    reaction: { emoji: string; emojiId?: string | null },
  ) => void;
  groupPosition?: "only" | "start" | "middle" | "end";
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (message: ChatMessageView) => void;
};

export function ChatMessageBubble({
  message,
  viewerId,
  onReply,
  onDelete,
  onEdit,
  onAddToPlaylist,
  onOpenImage,
  showSender = false,
  onToggleReaction,
  groupPosition = "only",
  selectionMode = false,
  selected = false,
  onSelect,
}: ChatMessageBubbleProps) {
  const isLg = useIsLgViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextAnchor, setContextAnchor] = useState<ContextMenuAnchor | null>(null);
  const [restoreFocusElement, setRestoreFocusElement] = useState<HTMLElement | null>(null);
  const { isMine, attachment } = message;
  const canSaveToPlaylist = Boolean(
    viewerId && onAddToPlaylist && messageHasMusicForPlaylist(message),
  );
  const hasMenu = Boolean(
    onReply ||
      onToggleReaction ||
      (isMine && onDelete) ||
      (isMine && onEdit) ||
      (canSaveToPlaylist && onAddToPlaylist),
  );
  const swipe = useSwipeToReply({
    enabled: !isLg && !selectionMode && Boolean(onReply),
    onReply: () => onReply?.(message),
  });

  const openMenu = () => {
    if (hasMenu) setMenuOpen(true);
  };

  return (
    <ChatMessageBubbleVisual
      message={message}
      groupPosition={groupPosition}
      showSender={showSender}
      interactive={hasMenu || selectionMode}
      onClick={() => {
        if (swipe.consumeClick()) return;
        if (selectionMode) onSelect?.(message);
        else if (!isLg) openMenu();
      }}
      {...swipe.pointerHandlers}
      swipeOffset={swipe.offset}
      swipeDragging={swipe.dragging}
      onDoubleClick={(event) => {
        if (!isLg || selectionMode || !onToggleReaction) return;
        event.preventDefault();
        onToggleReaction(message, { emoji: "❤️" });
      }}
      onContextMenu={(event) => {
        if (!hasMenu) return;
        event.preventDefault();
        if (selectionMode) {
          onSelect?.(message);
          return;
        }
        setRestoreFocusElement(event.currentTarget.querySelector<HTMLElement>(".voople-chat-bubble") ?? event.currentTarget);
        setContextAnchor({ kind: "point", x: event.clientX, y: event.clientY });
        setMenuOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          if (!hasMenu || selectionMode) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          setRestoreFocusElement(event.currentTarget);
          setContextAnchor({ kind: "rect", left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
          setMenuOpen(true);
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (selectionMode) onSelect?.(message);
          else openMenu();
        }
      }}
      selectionState={selectionMode ? selected : undefined}
      onToggleReaction={
        onToggleReaction && !selectionMode
          ? (reaction) => onToggleReaction(message, reaction)
          : undefined
      }
      senderAvatar={
        message.sender ? (
          <ProfileAvatar
            displayName={message.sender.displayName}
            size="sm"
            animatedAvatarUrl={message.sender.avatarUrl}
          />
        ) : null
      }
      menu={
        hasMenu && onReply && !selectionMode ? (
          <div
            className="absolute -right-9 top-1/2 z-20 -translate-y-1/2"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}>
            <ChatMessageMenu
              message={message}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              contextAnchor={contextAnchor}
              restoreFocusElement={restoreFocusElement}
              onTriggerOpen={() => { setContextAnchor(null); setRestoreFocusElement(null); }}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddToPlaylist={onAddToPlaylist}
              isMine={isMine}
              canAddToPlaylist={canSaveToPlaylist}
              onToggleReaction={(target, emoji: ChatReactionEmoji) => onToggleReaction?.(target, { emoji })}
              onSelect={onSelect}
              showOnHover={isLg}
              showTrigger
            />
          </div>
        ) : null
      }
      attachment={
        <ChatMessageAttachment
          messageId={message.id}
          attachment={attachment}
          isMine={isMine}
          onOpenImage={onOpenImage}
        />
      }
    />
  )
}
