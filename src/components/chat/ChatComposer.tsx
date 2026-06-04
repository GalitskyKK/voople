"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Send, Smile, X } from "lucide-react";

import { TrackMetadataConfirmCard } from "@/components/player/TrackMetadataConfirmCard";
import { Button } from "@/components/ui/Button";
import {
  useChatUpload,
  type PendingChatAudioDraft,
  type PendingChatUpload,
} from "@/hooks/useChatUpload";
import { readTrackMetadata } from "@/lib/player/metadata";
import { cn } from "@/lib/utils";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

import { ChatAttachMenu } from "./ChatAttachMenu";
import { ChatEmojiPicker } from "./ChatEmojiPicker";
import { ChatMusicAttachSheet } from "./ChatMusicAttachSheet";

type ChatComposerProps = {
  text: string;
  onTextChange: (value: string) => void;
  replyTo: ChatMessageView | null;
  onReplyCancel: () => void;
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
  onReplyCancel,
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

  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }
    };
  }, [pendingUpload?.previewUrl]);

  const canSend =
    !disabled &&
    !isSending &&
    !isUploading &&
    !isParsingAudio &&
    !pendingAudioDraft &&
    (Boolean(text.trim()) || Boolean(pendingUpload) || Boolean(pendingTrack));

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
    onPendingUploadChange(null);
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

  return (
    <div className="voople-chat-composer shrink-0 border-t border-[var(--app-border)] py-3">
      {replyTo && (
        <div className="voople-chat-composer__reply mb-2 flex items-start gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2">
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-xs font-medium text-[var(--app-muted)]">Ответ</p>
            <p className="truncate text-[var(--foreground)]">
              {replyTo.text?.trim() || "Вложение"}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]"
            aria-label="Отменить ответ"
            onClick={onReplyCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
          {pendingUpload.previewUrl ? (
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
            onClick={() => onPendingUploadChange(null)}
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
          onPendingUploadChange(null);
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

        <ChatAttachMenu
          open={attachOpen}
          onOpenChange={setAttachOpen}
          disabled={disabled || isUploading || isParsingAudio || Boolean(pendingAudioDraft)}
          onPickPhoto={() => imageInputRef.current?.click()}
          onPickAudioFile={() => audioInputRef.current?.click()}
          onPickMusic={() => setMusicSheetOpen(true)}
        />

        <label htmlFor={inputId} className="sr-only">
          Сообщение
        </label>
        <input
          id={inputId}
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
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

        <Button type="submit" variant="primary" disabled={!canSend} className="shrink-0 px-3">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
