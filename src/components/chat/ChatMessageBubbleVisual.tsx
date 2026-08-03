import { CornerDownRight } from "lucide-react";
import type { ReactNode } from "react";

import { LocalMessageTime } from "@/components/chat/LocalMessageTime";
import { MessageReadTicks } from "@/components/chat/MessageReadTicks";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
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
  groupPosition?: "only" | "start" | "middle" | "end";
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
  groupPosition = "only",
}: ChatMessageBubbleVisualProps) {
  const { isMine, text, createdAt, readAt, replyTo } = message;
  const hasText = Boolean(text?.trim());
  const messageMeta = (
    <span className="voople-chat-bubble__meta ml-2 inline-flex translate-y-0.5 items-center gap-0.5 whitespace-nowrap text-[10px] leading-none text-[var(--app-muted)]">
      <LocalMessageTime iso={createdAt} />
      {isMine ? <MessageReadTicks readAt={readAt} /> : null}
    </span>
  );

  return (
    <div
      className={cn(
        "voople-chat-bubble-row group/bubble flex w-full items-end gap-2",
        isMine ? "justify-end" : "justify-start",
        (groupPosition === "only" || groupPosition === "start") && "mt-1.5",
        className,
      )}
    >
      {showSender && !isMine ? (
        <div className="w-8 shrink-0">
          {groupPosition === "only" || groupPosition === "end"
            ? senderAvatar
            : null}
        </div>
      ) : null}
      <div
        className={cn(
          "voople-chat-bubble relative max-w-[min(86%,36rem)]",
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
            "voople-chat-bubble__body flex flex-col gap-1 rounded-[1.15rem] px-3 py-1.5 text-sm leading-[1.45]",
            isMine
              ? "bg-[color-mix(in_srgb,var(--theme-accent)_22%,var(--app-surface))] text-[var(--foreground)]"
              : "border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--foreground)]",
            groupPosition === "start" &&
              (isMine ? "rounded-br-lg" : "rounded-bl-lg"),
            groupPosition === "middle" &&
              (isMine ? "rounded-r-lg" : "rounded-l-lg"),
            (groupPosition === "only" || groupPosition === "end") &&
              (isMine ? "rounded-br-md" : "rounded-bl-md"),
          )}
        >
          {showSender &&
          !isMine &&
          message.sender &&
          (groupPosition === "only" || groupPosition === "start") ? (
            <DisplayNameWithPin
              hasVooplePlus={message.sender.hasVooplePlus}
              size="xs"
              className="max-w-full px-0.5 text-[11px] font-semibold text-[var(--theme-accent)]"
            >
              {message.sender.displayName}
            </DisplayNameWithPin>
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
            <p className="whitespace-pre-wrap break-words">
              {text}
              <span className="float-right">{messageMeta}</span>
            </p>
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

          {!hasText ? <div className="flex justify-end">{messageMeta}</div> : null}
        </div>
      </div>
    </div>
  );
}
