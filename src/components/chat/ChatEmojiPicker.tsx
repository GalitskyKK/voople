"use client";

import { useEffect, useRef } from "react";

import { CHAT_EMOJIS } from "@/components/chat/constants/emojis";
import { cn } from "@/lib/utils";

type ChatEmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  className?: string;
};

export function ChatEmojiPicker({ open, onClose, onPick, className }: ChatEmojiPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "voople-chat-emoji-picker grid grid-cols-8 gap-0.5 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-[var(--app-shadow-md)]",
        className,
      )}
      role="listbox"
      aria-label="Эмодзи"
    >
      {CHAT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="option"
          aria-selected="false"
          className="rounded-[var(--app-radius-sm)] p-1.5 text-lg leading-none transition-colors hover:bg-[var(--app-surface-soft)]"
          onClick={() => {
            onPick(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
