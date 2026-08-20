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
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenImage,
  groupPosition,
}: {
  message: ChatMessageView;
  showSender: boolean;
  onReply: (message: ChatMessageView) => void;
  onEdit: (message: ChatMessageView) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (
    messageId: string,
    reaction: { emoji: string; emojiId?: string | null },
  ) => void;
  onOpenImage?: (url: string) => void;
  groupPosition: "only" | "start" | "middle" | "end";
}) {
  const isLg = useIsLgViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = () => setMenuOpen(true);

  return (
    <ChatMessageBubbleVisual
      message={message}
      groupPosition={groupPosition}
      showSender={showSender}
      interactive
      onClick={() => {
        if (!isLg) openMenu();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMenu();
        }
      }}
      onToggleReaction={(reaction) => onToggleReaction(message.id, reaction)}
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
          <DesktopChatAttachment
            attachment={message.attachment}
            onOpenImage={onOpenImage}
          />
        ) : null
      }
      menu={
        <div
          className={cn(
            "absolute top-1/2 z-20 -translate-y-1/2",
            message.isMine ? "-left-9" : "-right-9",
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ChatMessageMenu
            message={message}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onReply={onReply}
            onEdit={onEdit}
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
            ) => onToggleReaction(message.id, { emoji })}
            showOnHover={isLg}
            showTrigger={isLg}
          />
        </div>
      }
    />
  );
}
