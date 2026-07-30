import { useState } from "react";

import { ChatMessageBubbleVisual } from "@/components/chat/ChatMessageBubbleVisual";
import { ChatMessageMenu } from "@/components/chat/ChatMessageMenu";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import type { ChatReactionEmoji } from "@/lib/chat/reactions";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";

import { DesktopChatAttachment } from "./DesktopChatAttachment";
import { DesktopChatAvatar } from "./DesktopChatAvatar";

export function DesktopChatMessage({
  message,
  showSender,
  onReply,
  onDelete,
  onToggleReaction,
}: {
  message: ChatMessageView;
  showSender: boolean;
  onReply: (message: ChatMessageView) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const isLg = useIsLgViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const openMobileMenu = () => {
    if (!isLg) setMenuOpen(true);
  };

  return (
    <ChatMessageBubbleVisual
      message={message}
      showSender={showSender}
      interactive={!isLg}
      onClick={openMobileMenu}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMobileMenu();
        }
      }}
      onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
      senderAvatar={
        message.sender ? (
          <DesktopChatAvatar
            displayName={message.sender.displayName}
            avatarUrl={message.sender.avatarUrl}
            className="mb-0.5"
          />
        ) : null
      }
      attachment={
        message.attachment ? (
          <DesktopChatAttachment attachment={message.attachment} />
        ) : null
      }
      menu={
        <div
          className={cn(
            "absolute top-1 z-20",
            message.isMine ? "left-1" : "right-1",
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ChatMessageMenu
            message={message}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onReply={onReply}
            onDelete={
              message.isMine
                ? () => {
                    if (
                      window.confirm(
                        "Удалить сообщение? Это действие нельзя отменить.",
                      )
                    ) {
                      onDelete(message.id);
                    }
                  }
                : undefined
            }
            isMine={message.isMine}
            onToggleReaction={(
              _message,
              emoji: ChatReactionEmoji,
            ) => onToggleReaction(message.id, emoji)}
            showOnHover={isLg}
          />
        </div>
      }
    />
  );
}
