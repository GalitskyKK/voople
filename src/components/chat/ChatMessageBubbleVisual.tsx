import { Check, CornerDownRight, Reply } from "lucide-react";
import type { ReactNode } from "react";

import { LocalMessageTime } from "@/components/chat/LocalMessageTime";
import { MessageReadTicks } from "@/components/chat/MessageReadTicks";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";
import { ChatMessageContent } from "./ChatMessageContent";

type ChatMessageBubbleVisualProps = {
  message: ChatMessageView;
  showSender?: boolean;
  senderAvatar?: ReactNode;
  attachment?: ReactNode;
  menu?: ReactNode;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
  interactive?: boolean;
  onToggleReaction?: (reaction: ChatMessageView["reactions"][number]) => void;
  groupPosition?: "only" | "start" | "middle" | "end";
  selectionState?: boolean;
  swipeOffset?: number;
  swipeDragging?: boolean;
};

export function ChatMessageBubbleVisual({
  message,
  showSender = false,
  senderAvatar,
  attachment,
  menu,
  className,
  onClick,
  onDoubleClick,
  onContextMenu,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  interactive = false,
  onToggleReaction,
  groupPosition = "only",
  selectionState,
  swipeOffset = 0,
  swipeDragging = false,
}: ChatMessageBubbleVisualProps) {
  const { isMine, text, createdAt, readAt, replyTo } = message;
  const selectionActive = selectionState !== undefined;
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
        "voople-chat-bubble-row group/bubble relative flex w-full items-end gap-2",
        selectionActive && "voople-chat-bubble-row--selection",
        selectionState && "voople-chat-bubble-row--selected",
        isMine ? "justify-end 2xl:justify-start" : "justify-start",
        (groupPosition === "only" || groupPosition === "start") && "mt-1.5",
        className
      )}
      onClick={selectionActive ? onClick : undefined}
      onContextMenu={selectionActive ? onContextMenu : undefined}
      onKeyDown={selectionActive ? onKeyDown : undefined}
      role={selectionActive ? "button" : undefined}
      tabIndex={selectionActive ? 0 : undefined}
      aria-pressed={selectionActive ? selectionState : undefined}>
      {selectionActive ? (
        <span className="voople-chat-bubble-row__selection-marker" aria-hidden>
          {selectionState ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      ) : null}
      {/* {showSender && !isMine ? (
        <div className="w-8 shrink-0">
          {groupPosition === "only" || groupPosition === "end" ? senderAvatar : null}
        </div>
      ) : null} */}
      {senderAvatar ? (
        <div
          className={cn("w-8 shrink-0", showSender && !isMine ? "block" : "hidden", "2xl:block")}>
          {groupPosition === "only" || groupPosition === "end" ? senderAvatar : null}
        </div>
      ) : null}
      {swipeOffset > 0 && !selectionActive ? (
        <span
          className="voople-chat-bubble-row__swipe-reply"
          style={{ opacity: Math.min(1, swipeOffset / 52) }}
          aria-hidden>
          <Reply className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "voople-chat-bubble relative max-w-[min(86%,36rem)]",
          swipeDragging && "voople-chat-bubble--swiping",
          isMine ? "voople-chat-bubble--mine" : "voople-chat-bubble--theirs"
        )}
        style={swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
        onClick={selectionActive ? undefined : onClick}
        onDoubleClick={selectionActive ? undefined : onDoubleClick}
        onContextMenu={selectionActive ? undefined : onContextMenu}
        onKeyDown={selectionActive ? undefined : onKeyDown}
        onPointerDown={selectionActive ? undefined : onPointerDown}
        onPointerMove={selectionActive ? undefined : onPointerMove}
        onPointerUp={selectionActive ? undefined : onPointerUp}
        onPointerCancel={selectionActive ? undefined : onPointerCancel}
        role={!selectionActive && interactive ? "button" : undefined}
        tabIndex={!selectionActive && interactive ? 0 : undefined}>
        {menu}
        <div
          className={cn(
            "voople-chat-bubble__body flex flex-col gap-1 rounded-[1.15rem] px-3 py-1.5 text-sm leading-[1.45]",
            isMine
              ? "bg-[color-mix(in_srgb,var(--theme-accent)_22%,var(--app-surface))] text-[var(--foreground)]"
              : "border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--foreground)]",
            groupPosition === "start" &&
              (isMine
                ? "rounded-br-lg 2xl:rounded-bl-lg 2xl:rounded-br-[1.15rem]"
                : "rounded-bl-lg"),

            groupPosition === "middle" &&
              (isMine ? "rounded-r-lg 2xl:rounded-l-lg 2xl:rounded-r-[1.15rem]" : "rounded-l-lg"),

            (groupPosition === "only" || groupPosition === "end") &&
              (isMine
                ? "rounded-br-md 2xl:rounded-bl-md 2xl:rounded-br-[1.15rem]"
                : "rounded-bl-md")
          )}>
          {showSender &&
          !isMine &&
          message.sender &&
          (groupPosition === "only" || groupPosition === "start") ? (
            <DisplayNameWithPin
              hasVooplePlus={message.sender.hasVooplePlus}
              size="xs"
              className="max-w-full px-0.5 text-[11px] font-semibold text-[var(--theme-accent)]">
              {message.sender.displayName}
            </DisplayNameWithPin>
          ) : null}
          {replyTo ? (
            <div
              className={cn(
                "voople-chat-bubble__reply flex gap-2 border-l-2 py-0.5 pl-2 text-xs",
                isMine
                  ? "border-[color-mix(in_srgb,var(--theme-accent)_65%,transparent)]"
                  : "border-[var(--theme-accent)]"
              )}>
              <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{replyTo.isMine ? "Вы" : "Собеседник"}</p>
                <p className="truncate text-[var(--app-muted)]">
                  {replyTo.text?.trim() || "Вложение"}
                </p>
              </div>
            </div>
          ) : null}

          {attachment}
          {hasText ? (
            <p className="whitespace-pre-wrap break-words">
              <ChatMessageContent nodes={message.content} fallback={text ?? ""} />
              <span className="float-right">{messageMeta}</span>
            </p>
          ) : null}

          {message.reactions.length > 0 ? (
            <div
              className={cn("flex flex-wrap gap-1 pt-0.5", selectionActive && "pointer-events-none")}
              onClick={(event) => {
                if (!selectionActive) event.stopPropagation();
              }}>
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => onToggleReaction?.(reaction)}
                  disabled={!onToggleReaction}
                  aria-pressed={reaction.reactedByMe}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_78%,transparent)] px-1.5 text-xs text-[var(--app-muted)] transition",
                    reaction.reactedByMe &&
                      "border-[color-mix(in_srgb,var(--theme-accent)_42%,var(--app-border))] bg-[var(--app-accent-soft)] text-[var(--foreground)]"
                  )}>
                  {reaction.emojiUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reaction.emojiUrl} alt={reaction.emoji} className="h-4 w-4 object-contain" />
                  ) : <span>{reaction.emoji}</span>}
                  <span className="text-[10px] tabular-nums">{reaction.count}</span>
                </button>
              ))}
            </div>
          ) : null}

          {!hasText ? <div className="flex justify-end">{messageMeta}</div> : null}
        </div>
      </div>
    </div>
  )
}
