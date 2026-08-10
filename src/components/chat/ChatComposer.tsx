"use client";

import { useId, useRef, useState } from "react";
import { Send, Smile } from "lucide-react";

import { TrackMetadataConfirmCard } from "@/components/player/TrackMetadataConfirmCard";
import { Button } from "@/components/ui/Button";
import {
  useChatUpload,
  type PendingChatAudioDraft,
  type PendingChatUpload,
} from "@/hooks/useChatUpload";
import { readTrackMetadata } from "@/lib/player/metadata";
import { getChatClipboardFile } from "@/lib/chat/clipboard";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

import { ChatAttachMenu } from "./ChatAttachMenu";
import {
  ChatComposerContextPreview,
  ChatComposerFrame,
} from "./ChatComposerVisual";
import { ChatEmojiPicker } from "./ChatEmojiPicker";
import { ChatMusicAttachSheet } from "./ChatMusicAttachSheet";
import { ChatVoiceRecorder, type ChatRecordMode } from "./ChatVoiceRecorder";

type ChatComposerProps = {
  text: string;
  onTextChange: (value: string) => void;
  replyTo: ChatMessageView | null;
  editing?: ChatMessageView | null;
  onReplyCancel: () => void;
  onEditCancel?: () => void;
  pendingUpload: PendingChatUpload | null;
  onPendingUploadChange: (value: PendingChatUpload | null) => void;
  pendingTrack: PlaylistTrackView | null;
  onPendingTrackChange: (value: PlaylistTrackView | null) => void;
  onSend: () => void;
  isSending: boolean;
  disabled?: boolean;
};

export function ChatComposer({
  text,
  onTextChange,
  replyTo,
  editing = null,
  onReplyCancel,
  onEditCancel,
  pendingUpload,
  onPendingUploadChange,
  pendingTrack,
  onPendingTrackChange,
  onSend,
  isSending,
  disabled,
}: ChatComposerProps) {
  const inputId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [pendingAudioDraft, setPendingAudioDraft] = useState<PendingChatAudioDraft | null>(null);
  const [isParsingAudio, setIsParsingAudio] = useState(false);
  const { uploadFile, isUploading, error, setError } = useChatUpload();

  const clearPendingUpload = () => {
    if (pendingUpload?.previewUrl) URL.revokeObjectURL(pendingUpload.previewUrl);
    onPendingUploadChange(null);
  };

  const canSend =
    !disabled &&
    !isSending &&
    !isUploading &&
    !isParsingAudio &&
    !pendingAudioDraft &&
    (Boolean(text.trim()) || Boolean(pendingUpload) || Boolean(pendingTrack)) &&
    (!editing || text.trim() !== editing.text?.trim());

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPendingAudioDraft(null);
    onPendingTrackChange(null);
    const uploaded = await uploadFile(file);
    if (uploaded) onPendingUploadChange(uploaded);
  };

  const handleAudioFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    onPendingTrackChange(null);
    clearPendingUpload();
    setIsParsingAudio(true);
    try {
      const meta = await readTrackMetadata(file);
      setPendingAudioDraft({
        file,
        title: meta.title,
        artist: meta.artist,
        durationSeconds: meta.durationSeconds,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось прочитать файл");
    } finally {
      setIsParsingAudio(false);
    }
  };

  const handleVoiceRecorded = async (file: File, durationSeconds: number, mode: ChatRecordMode) => {
    setError(null);
    onPendingTrackChange(null);
    clearPendingUpload();
    const uploaded = await uploadFile(file, { purpose: mode });
    if (uploaded) {
      onPendingUploadChange(mode === "voice" ? {
        ...uploaded,
        title: "Голосовое сообщение",
        artist: `${durationSeconds} сек.`,
        durationSeconds,
      } : { ...uploaded, durationSeconds });
    }
  };

  const handleConfirmAudioDraft = async (draft: {
    title: string;
    artist: string;
    durationSeconds: number | null;
  }) => {
    if (!pendingAudioDraft) return;
    setError(null);
    const uploaded = await uploadFile(pendingAudioDraft.file);
    if (uploaded) {
      onPendingUploadChange({
        ...uploaded,
        title: draft.title,
        artist: draft.artist,
        durationSeconds: draft.durationSeconds ?? pendingAudioDraft.durationSeconds,
      });
      setPendingAudioDraft(null);
    }
  };

  const handlePastedFile = async (file: File) => {
    try {
      const { kind } = parseChatUploadMime(file.type);
      if (kind === "audio") {
        await handleAudioFileSelected(file);
      } else if (kind === "circle") {
        setError(null);
        setPendingAudioDraft(null);
        onPendingTrackChange(null);
        clearPendingUpload();
        const uploaded = await uploadFile(file, { purpose: "circle" });
        if (uploaded) onPendingUploadChange(uploaded);
      } else {
        await handleImageFile(file);
      }
    } catch (pasteError) {
      setError(
        pasteError instanceof Error
          ? pasteError.message
          : "Формат файла не поддерживается",
      );
    }
  };

  return (
    <ChatComposerFrame>
      {editing && (
        <ChatComposerContextPreview
          label="Редактирование"
          text={editing.text ?? ""}
          accent
          onClose={() => onEditCancel?.()}
        />
      )}
      {replyTo && (
        <ChatComposerContextPreview
          label="Ответ"
          text={replyTo.text?.trim() || "Вложение"}
          onClose={onReplyCancel}
        />
      )}

      {pendingAudioDraft && (
        <div className="mb-2">
          <TrackMetadataConfirmCard
            initialTitle={pendingAudioDraft.title}
            initialArtist={pendingAudioDraft.artist}
            heading="Аудио перед отправкой"
            confirmLabel="Прикрепить"
            isSubmitting={isUploading}
            error={error}
            onCancel={() => setPendingAudioDraft(null)}
            onConfirm={(draft) => void handleConfirmAudioDraft(draft)}
          />
        </div>
      )}

      {pendingUpload && !pendingAudioDraft && (
        <div className="voople-chat-composer__pending mb-2 flex items-center gap-2 text-sm">
          {pendingUpload.previewUrl && pendingUpload.kind === "circle" ? (
            <video src={pendingUpload.previewUrl} muted playsInline className="h-14 w-14 rounded-full object-cover" />
          ) : pendingUpload.previewUrl && pendingUpload.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pendingUpload.previewUrl}
              alt=""
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <span className="min-w-0 truncate text-[var(--app-muted)]">
              ♪ {pendingUpload.title ?? pendingUpload.fileName} · {pendingUpload.artist ?? "…"}
            </span>
          )}
          <button
            type="button"
            className="shrink-0 text-xs text-[var(--app-muted)] hover:text-[var(--foreground)]"
            onClick={clearPendingUpload}
          >
            Убрать
          </button>
        </div>
      )}

      {pendingTrack && (
        <div className="voople-chat-composer__pending mb-2 flex items-center gap-2 text-sm">
          <span className="text-[var(--theme-accent)]">♪</span>
          <span className="min-w-0 truncate">
            {pendingTrack.title} · {pendingTrack.artist}
          </span>
          <button
            type="button"
            className="text-xs text-[var(--app-muted)] hover:text-[var(--foreground)]"
            onClick={() => onPendingTrackChange(null)}
          >
            Убрать
          </button>
        </div>
      )}

      {error && !pendingAudioDraft && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          void handleImageFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/m4a,audio/ogg,audio/wav,audio/webm"
        className="sr-only"
        onChange={(e) => {
          void handleAudioFileSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <ChatMusicAttachSheet
        open={musicSheetOpen}
        onClose={() => setMusicSheetOpen(false)}
        onSelect={(track) => {
          clearPendingUpload();
          setPendingAudioDraft(null);
          onPendingTrackChange(track);
        }}
      />

      <form
        className="relative flex items-end gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
      >
        <ChatEmojiPicker
          open={emojiOpen}
          onClose={() => setEmojiOpen(false)}
          onPick={(emoji) => onTextChange(text + emoji)}
          className="absolute bottom-full right-12 z-10 mb-2"
        />

        {!editing ? (
          <ChatAttachMenu
            open={attachOpen}
            onOpenChange={setAttachOpen}
            disabled={disabled || isUploading || isParsingAudio || Boolean(pendingAudioDraft)}
            onPickPhoto={() => imageInputRef.current?.click()}
            onPickAudioFile={() => audioInputRef.current?.click()}
            onPickMusic={() => setMusicSheetOpen(true)}
          />
        ) : null}

        <label htmlFor={inputId} className="sr-only">
          Сообщение
        </label>
        <input
          id={inputId}
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onPaste={(event) => {
            const file = getChatClipboardFile(event.clipboardData);
            if (!file) return;
            event.preventDefault();
            void handlePastedFile(file);
          }}
          placeholder="Сообщение…"
          maxLength={1000}
          disabled={disabled || Boolean(pendingAudioDraft)}
          className="voople-input min-w-0 flex-1 py-2.5 text-sm"
        />

        <button
          type="button"
          className={cn(
            "rounded-[var(--app-radius-sm)] p-2 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
            emojiOpen && "bg-[var(--app-surface-soft)] text-[var(--foreground)]",
          )}
          aria-label="Эмодзи"
          aria-expanded={emojiOpen}
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <Smile className="h-5 w-5" />
        </button>

        {!editing && !text.trim() && !pendingUpload && !pendingTrack ? (
          <ChatVoiceRecorder
            disabled={disabled || isSending || isUploading || isParsingAudio}
            onRecorded={(file, duration, mode) => void handleVoiceRecorded(file, duration, mode)}
            onError={setError}
          />
        ) : null}

        <Button type="submit" variant="primary" disabled={!canSend} className="shrink-0 px-3">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </ChatComposerFrame>
  );
}
