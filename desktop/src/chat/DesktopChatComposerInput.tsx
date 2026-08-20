import {
  ImageIcon,
  LoaderCircle,
  Music,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { ChatEmojiPicker } from "@/components/chat/ChatEmojiPicker";
import { ChatVoiceRecorder } from "@/components/chat/ChatVoiceRecorder";
import { CHAT_COMPOSER_ICON_BUTTON_CLASS, CHAT_COMPOSER_SURFACE_CLASS } from "@/components/chat/ChatComposerVisual";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { getChatClipboardFile } from "@/lib/chat/clipboard";
import { cn } from "@/lib/utils";
import type { GroupEmojiView } from "@/types/chat";

export function DesktopChatComposerInput({
  text,
  canSend,
  sending,
  uploading,
  hasUpload,
  editing,
  onTextChange,
  onSubmit,
  onImageSelected,
  onAudioSelected,
  onPastedFile,
  onVoiceRecorded,
  onError,
  customEmojis = [],
}: {
  text: string;
  canSend: boolean;
  sending: boolean;
  uploading: boolean;
  hasUpload: boolean;
  editing: boolean;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onImageSelected: (file?: File) => void | Promise<void>;
  onAudioSelected: (file?: File) => void | Promise<void>;
  onPastedFile: (file: File) => void | Promise<void>;
  onVoiceRecorded: (
    file: File,
    durationSeconds: number,
    purpose: "voice" | "circle",
  ) => void;
  onError: (message: string) => void;
  customEmojis?: GroupEmojiView[];
}) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useAutosizeTextarea(text);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          void onImageSelected(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/m4a,audio/ogg,audio/wav,audio/webm"
        className="sr-only"
        onChange={(event) => {
          void onAudioSelected(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className={cn("relative flex items-end gap-1.5", CHAT_COMPOSER_SURFACE_CLASS)}>
        {!editing ? <DropdownMenu
          open={attachOpen}
          onOpenChange={setAttachOpen}
          align="start"
          trigger={
            <button
              type="button"
              disabled={uploading}
              className={CHAT_COMPOSER_ICON_BUTTON_CLASS}
              aria-label="Вложения"
              aria-expanded={attachOpen}
            >
              {uploading ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </button>
          }
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--app-surface-soft)]"
            onClick={() => {
              setAttachOpen(false);
              imageInputRef.current?.click();
            }}
          >
            <ImageIcon className="h-4 w-4" />
            Изображение
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--app-surface-soft)]"
            onClick={() => {
              setAttachOpen(false);
              audioInputRef.current?.click();
            }}
          >
            <Music className="h-4 w-4" />
            Аудиофайл
          </button>
        </DropdownMenu> : null}

        <div className="relative">
          <button
            type="button"
            className={cn(
              CHAT_COMPOSER_ICON_BUTTON_CLASS,
              emojiOpen && "bg-[var(--app-surface-soft)] text-[var(--foreground)]",
            )}
            onClick={() => setEmojiOpen((current) => !current)}
            aria-label="Эмодзи"
            aria-expanded={emojiOpen}
          >
            <Smile className="h-5 w-5" />
          </button>
          <ChatEmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onPick={(emoji) => onTextChange(`${text}${emoji}`.slice(0, 1000))}
            customEmojis={customEmojis}
            className="absolute bottom-12 left-0 z-30 w-72"
          />
        </div>

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
          placeholder="Сообщение"
          aria-label="Сообщение"
          className="min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-[var(--app-muted)]"
        />

        {!editing && !text.trim() && !hasUpload ? (
          <ChatVoiceRecorder
            disabled={sending || uploading}
            onRecorded={onVoiceRecorded}
            onError={onError}
          />
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="shrink-0 px-3"
          disabled={!canSend}
          aria-label="Отправить сообщение"
        >
          {sending ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </>
  );
}
