import { CornerDownRight } from "lucide-react";
import type { ReactNode } from "react";

import { LocalMessageTime } from "@/components/chat/LocalMessageTime";
import { MessageReadTicks } from "@/components/chat/MessageReadTicks";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";

type ChatMessageBubbleVisualProps = {
  message: ChatMessageView;
  showSender?: boolean;
  senderAvatar?: ReactNode;
  attachment?: ReactNode;
  menu?: ReactNode;
  className?: string;
  onClick?: () => void;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  interactive?: boolean;
  onToggleReaction?: (emoji: string) => void;
};

export function ChatMessageBubbleVisual({
  message,
  showSender = false,
  senderAvatar,
  attachment,
  menu,
  className,
  onClick,
  onContextMenu,
  onKeyDown,
  interactive = false,
  onToggleReaction,
}: ChatMessageBubbleVisualProps) {
  const { isMine, text, createdAt, readAt, replyTo } = message;
  const hasText = Boolean(text?.trim());

  return (
    <div
      className={cn(
        "voople-chat-bubble-row group/bubble flex w-full items-end gap-2",
        isMine ? "justify-end" : "justify-start",
        className,
      )}
    >
      {showSender && !isMine ? senderAvatar : null}
      <div
        className={cn(
          "voople-chat-bubble relative max-w-[min(100%,22rem)]",
          isMine ? "voople-chat-bubble--mine" : "voople-chat-bubble--theirs",
        )}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        {menu}
        <div
          className={cn(
            "voople-chat-bubble__body flex flex-col gap-1.5 rounded-2xl px-3 py-2 text-sm leading-relaxed",
            menu && "pt-7",
            isMine
              ? "rounded-br-md bg-[color-mix(in_srgb,var(--theme-accent)_22%,var(--app-surface))] text-[var(--foreground)]"
              : "rounded-bl-md border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--foreground)]",
          )}
        >
          {showSender && !isMine && message.sender ? (
            <p className="truncate px-0.5 text-[11px] font-semibold text-[var(--theme-accent)]">
              {message.sender.displayName}
            </p>
          ) : null}
          {replyTo ? (
            <div
              className={cn(
                "voople-chat-bubble__reply flex gap-2 border-l-2 py-0.5 pl-2 text-xs",
                isMine
                  ? "border-[color-mix(in_srgb,var(--theme-accent)_65%,transparent)]"
                  : "border-[var(--theme-accent)]",
              )}
            >
              <CornerDownRight
                className="mt-0.5 h-3 w-3 shrink-0 opacity-70"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-medium">
                  {replyTo.isMine ? "Вы" : "Собеседник"}
                </p>
                <p className="truncate text-[var(--app-muted)]">
                  {replyTo.text?.trim() || "Вложение"}
                </p>
              </div>
            </div>
          ) : null}

          {attachment}
          {hasText ? (
            <p className="whitespace-pre-wrap break-words">{text}</p>
          ) : null}

          {message.reactions.length > 0 ? (
            <div
              className="flex flex-wrap gap-1 pt-0.5"
              onClick={(event) => event.stopPropagation()}
            >
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => onToggleReaction?.(reaction.emoji)}
                  disabled={!onToggleReaction}
                  aria-pressed={reaction.reactedByMe}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_78%,transparent)] px-1.5 text-xs text-[var(--app-muted)] transition",
                    reaction.reactedByMe &&
                      "border-[color-mix(in_srgb,var(--theme-accent)_42%,var(--app-border))] bg-[var(--app-accent-soft)] text-[var(--foreground)]",
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px] tabular-nums">
                    {reaction.count}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="voople-chat-bubble__meta flex items-center justify-end gap-1 text-[10px] text-[var(--app-muted)]">
            <LocalMessageTime iso={createdAt} />
            {isMine ? <MessageReadTicks readAt={readAt} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
