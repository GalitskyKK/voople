import {
  ImageIcon,
  LoaderCircle,
  Music,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { ChatEmojiPicker } from "@/components/chat/ChatEmojiPicker";
import { ChatVoiceRecorder } from "@/components/chat/ChatVoiceRecorder";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { getChatClipboardFile } from "@/lib/chat/clipboard";

export function DesktopChatComposerInput({
  text,
  canSend,
  sending,
  uploading,
  hasUpload,
  onTextChange,
  onSubmit,
  onImageSelected,
  onAudioSelected,
  onPastedFile,
  onVoiceRecorded,
  onError,
}: {
  text: string;
  canSend: boolean;
  sending: boolean;
  uploading: boolean;
  hasUpload: boolean;
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
}) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [text]);

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

      <div className="desktop-chat-composer__row">
        <DropdownMenu
          open={attachOpen}
          onOpenChange={setAttachOpen}
          align="start"
          trigger={
            <button
              type="button"
              disabled={uploading}
              className="desktop-chat-composer__utility"
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
            className="desktop-chat-composer__menu-item"
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
            className="desktop-chat-composer__menu-item"
            onClick={() => {
              setAttachOpen(false);
              audioInputRef.current?.click();
            }}
          >
            <Music className="h-4 w-4" />
            Аудиофайл
          </button>
        </DropdownMenu>

        <div className="relative">
          <button
            type="button"
            className="desktop-chat-composer__utility"
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
        />

        {!text.trim() && !hasUpload ? (
          <ChatVoiceRecorder
            disabled={sending || uploading}
            onRecorded={onVoiceRecorded}
            onError={onError}
          />
        ) : null}

        <button
          type="submit"
          className="desktop-chat-composer__send"
          disabled={!canSend}
          aria-label="Отправить сообщение"
        >
          {sending ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </>
  );
}
