"use client";

import { ListPlus, MoreHorizontal, Reply, Trash2 } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { messageHasMusicForPlaylist } from "@/lib/chat/playlist-from-message";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";

type ChatMessageMenuProps = {
  message: ChatMessageView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReply: (message: ChatMessageView) => void;
  onDelete?: (message: ChatMessageView) => void;
  onAddToPlaylist?: (message: ChatMessageView) => void;
  isMine: boolean;
  showOnHover?: boolean;
  canAddToPlaylist?: boolean;
};

export function ChatMessageMenu({
  message,
  open,
  onOpenChange,
  onReply,
  onDelete,
  onAddToPlaylist,
  isMine,
  showOnHover = true,
  canAddToPlaylist = false,
}: ChatMessageMenuProps) {
  const showPlaylist =
    canAddToPlaylist && messageHasMusicForPlaylist(message) && onAddToPlaylist;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={onOpenChange}
      align={isMine ? "end" : "start"}
      className={cn(
        "transition-opacity",
        showOnHover && !open && "opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100",
        open && "opacity-100",
      )}
      trigger={
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--app-surface)_85%,transparent)] text-[var(--app-muted)] shadow-sm hover:text-[var(--foreground)]"
          aria-label="Действия с сообщением"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      }
    >
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
        onClick={() => {
          onReply(message);
          onOpenChange(false);
        }}
      >
        <Reply className="h-4 w-4" />
        Ответить
      </button>

      {showPlaylist && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          onClick={() => {
            onAddToPlaylist(message);
            onOpenChange(false);
          }}
        >
          <ListPlus className="h-4 w-4" />
          В плейлист
        </button>
      )}

      {isMine && onDelete && (
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          onClick={() => {
            onDelete(message);
            onOpenChange(false);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Удалить
        </button>
      )}
    </DropdownMenu>
  );
}
