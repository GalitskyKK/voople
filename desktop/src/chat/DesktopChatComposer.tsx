import type { Session } from "@supabase/supabase-js";
import {
  ImageIcon,
  LoaderCircle,
  Music,
  Paperclip,
  Send,
} from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { ChatVoiceRecorder } from "@/components/chat/ChatVoiceRecorder";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { ChatMessageView } from "@/types/chat";

import type { DesktopConfig } from "../config";
import { DesktopChatComposerPreview } from "./DesktopChatComposerPreview";
import type { DesktopMessageDraft } from "./useDesktopChatThread";
import { useDesktopChatUpload } from "./useDesktopChatUpload";

export function DesktopChatComposer({
  config,
  session,
  replyTo,
  sending,
  onCancelReply,
  onSend,
}: {
  config: DesktopConfig;
  session: Session;
  replyTo: ChatMessageView | null;
  sending: boolean;
  onCancelReply: () => void;
  onSend: (draft: DesktopMessageDraft) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const {
    clear,
    error,
    setError,
    updateAudioMetadata,
    upload,
    uploadFile,
    uploading,
  } = useDesktopChatUpload(config, session);

  const audioMetadataReady =
    upload?.kind !== "audio" ||
    Boolean(upload.title?.trim() && upload.artist?.trim());
  const canSend =
    !sending &&
    !uploading &&
    audioMetadataReady &&
    Boolean(text.trim() || upload);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    const sent = await onSend({ text, replyTo, upload });
    if (!sent) return;
    setText("");
    clear();
    onCancelReply();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const selectImage = async (file?: File) => {
    if (file) await uploadFile(file);
  };

  const selectAudio = async (file?: File) => {
    if (!file) return;
    const uploaded = await uploadFile(file);
    if (!uploaded) return;
    updateAudioMetadata({
      title: file.name.replace(/\.[^.]+$/u, "") || "Аудиофайл",
      artist: "Аудиосообщение",
    });
  };

  return (
    <form
      className="desktop-chat-composer"
      onSubmit={(event) => void submit(event)}
    >
      <DesktopChatComposerPreview
        replyTo={replyTo}
        upload={upload}
        onCancelReply={onCancelReply}
        onClearUpload={clear}
        onUpdateAudioMetadata={updateAudioMetadata}
      />

      {error ? (
        <p className="form-error desktop-chat-composer__error" role="alert">
          {error}
        </p>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          void selectImage(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/m4a,audio/ogg,audio/wav,audio/webm"
        className="sr-only"
        onChange={(event) => {
          void selectAudio(event.target.files?.[0]);
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

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 1000))}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={1000}
          placeholder="Сообщение"
          aria-label="Сообщение"
        />

        {!text.trim() && !upload ? (
          <ChatVoiceRecorder
            disabled={sending || uploading}
            onRecorded={(file, durationSeconds, purpose) => {
              void uploadFile(file, { purpose, durationSeconds });
            }}
            onError={setError}
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
      <span className="desktop-chat-composer__counter">
        {text.length}/1000
      </span>
    </form>
  );
}
