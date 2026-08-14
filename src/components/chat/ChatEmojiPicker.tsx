"use client";

import { useEffect, useRef } from "react";

import { CHAT_EMOJIS } from "@/components/chat/constants/emojis";
import { cn } from "@/lib/utils";
import type { GroupEmojiView } from "@/types/chat";

type ChatEmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  customEmojis?: GroupEmojiView[];
  className?: string;
};

export function ChatEmojiPicker({ open, onClose, onPick, customEmojis = [], className }: ChatEmojiPickerProps) {
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
        "voople-chat-emoji-picker grid max-h-72 grid-cols-8 gap-0.5 overflow-y-auto rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-[var(--app-shadow-md)]",
        className,
      )}
      role="listbox"
      aria-label="Эмодзи"
    >
      {customEmojis.length ? <p className="col-span-8 px-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--app-muted)]">Эмодзи группы</p> : null}
      {customEmojis.map((emoji) => (
        <button
          key={emoji.id}
          type="button"
          role="option"
          aria-selected="false"
          className="grid aspect-square place-items-center rounded-[var(--app-radius-sm)] p-1 transition-colors hover:bg-[var(--app-surface-soft)]"
          onClick={() => { onPick(`:${emoji.name}:`); onClose(); }}
          title={`:${emoji.name}:`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={emoji.url} alt={`:${emoji.name}:`} className="h-6 w-6 object-contain" loading="lazy" />
        </button>
      ))}
      {customEmojis.length ? <p className="col-span-8 px-1 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--app-muted)]">Обычные</p> : null}
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
