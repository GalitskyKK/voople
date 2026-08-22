"use client";

import { LoaderCircle, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";
import { getChatClipboardFile } from "@/lib/chat/clipboard";
import { cn } from "@/lib/utils";
import type { GroupEmojiView } from "@/types/chat";

import { ChatAttachMenu } from "./ChatAttachMenu";
import { ChatEmojiPicker } from "./ChatEmojiPicker";
import { CHAT_COMPOSER_ICON_BUTTON_CLASS } from "./ChatComposerVisual";
import { ChatVoiceRecorder, type ChatRecordMode } from "./ChatVoiceRecorder";

export function ChatComposerInputView({
  focusKey,
  text,
  canSend,
  sending,
  busy,
  hasAttachment,
  editing,
  disabled = false,
  onTextChange,
  onSubmit,
  onImageSelected,
  onAudioSelected,
  onPastedFile,
  onVoiceRecorded,
  onPickMusic,
  onError,
  customEmojis = [],
}: {
  focusKey: string;
  text: string;
  canSend: boolean;
  sending: boolean;
  busy: boolean;
  hasAttachment: boolean;
  editing: boolean;
  disabled?: boolean;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onImageSelected: (file?: File) => void | Promise<void>;
  onAudioSelected: (file?: File) => void | Promise<void>;
  onPastedFile: (file: File) => void | Promise<void>;
  onVoiceRecorded: (file: File, durationSeconds: number, mode: ChatRecordMode) => void;
  onPickMusic?: () => void;
  onError: (message: string) => void;
  customEmojis?: GroupEmojiView[];
}) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useAutosizeTextarea(text);

  useEffect(() => {
    if (disabled || !window.matchMedia("(pointer: fine)").matches) return;
    const frame = window.requestAnimationFrame(() =>
      textareaRef.current?.focus({ preventScroll: true }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [disabled, focusKey, textareaRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (canSend) onSubmit();
  };

  return (
    <>
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { void onImageSelected(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={audioInputRef} type="file" accept="audio/mpeg,audio/mp4,audio/m4a,audio/ogg,audio/wav,audio/webm" className="sr-only" onChange={(event) => { void onAudioSelected(event.target.files?.[0]); event.target.value = ""; }} />

      {!editing ? (
        <ChatAttachMenu
          open={attachOpen}
          onOpenChange={setAttachOpen}
          disabled={disabled || busy}
          loading={busy}
          onPickPhoto={() => imageInputRef.current?.click()}
          onPickAudioFile={() => audioInputRef.current?.click()}
          onPickMusic={onPickMusic}
        />
      ) : null}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => onTextChange(event.target.value.slice(0, 1000))}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          const file = getChatClipboardFile(event.clipboardData);
          if (!file) return;
          event.preventDefault();
          void onPastedFile(file);
        }}
        rows={1}
        maxLength={1000}
        disabled={disabled}
        placeholder="Сообщение…"
        aria-label="Сообщение"
        className="min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-[var(--app-muted)] disabled:opacity-50"
      />

      <div className="relative">
        <button type="button" className={cn(CHAT_COMPOSER_ICON_BUTTON_CLASS, emojiOpen && "bg-[var(--app-surface-soft)] text-[var(--foreground)]")} onClick={() => setEmojiOpen((current) => !current)} aria-label="Эмодзи" aria-expanded={emojiOpen}>
          <Smile className="h-5 w-5" />
        </button>
        <ChatEmojiPicker open={emojiOpen} onClose={() => setEmojiOpen(false)} onPick={(emoji) => onTextChange(`${text}${emoji}`.slice(0, 1000))} customEmojis={customEmojis} className="absolute bottom-12 right-0 z-30 w-72" />
      </div>

      {!editing && !text.trim() && !hasAttachment ? (
        <ChatVoiceRecorder disabled={disabled || sending || busy} onRecorded={onVoiceRecorded} onError={onError} />
      ) : null}

      <Button type="submit" variant="primary" className="shrink-0 px-3" disabled={!canSend} aria-label="Отправить сообщение">
        {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </>
  );
}
