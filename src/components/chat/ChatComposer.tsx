"use client";

import { useState } from "react";

import { TrackMetadataConfirmCard } from "@/components/player/TrackMetadataConfirmCard";
import {
  useChatUpload,
  type PendingChatAudioDraft,
  type PendingChatUpload,
} from "@/hooks/useChatUpload";
import { readTrackMetadata } from "@/lib/player/metadata";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatMessageView, GroupEmojiView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

import { ChatComposerInputView } from "./ChatComposerInputView";
import {
  ChatComposerContextPreview,
  ChatComposerFrame,
  CHAT_COMPOSER_SURFACE_CLASS,
} from "./ChatComposerVisual";
import { ChatMusicAttachSheet } from "./ChatMusicAttachSheet";
import type { ChatRecordMode } from "./ChatVoiceRecorder";

type ChatComposerProps = {
  chatId: string;
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
  customEmojis?: GroupEmojiView[];
};

export function ChatComposer({
  chatId,
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
  customEmojis = [],
}: ChatComposerProps) {
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [pendingAudioDraft, setPendingAudioDraft] = useState<PendingChatAudioDraft | null>(null);
  const [isParsingAudio, setIsParsingAudio] = useState(false);
  const { uploadFile, isUploading, error, setError } = useChatUpload(chatId);

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
        className={`relative flex items-end gap-1.5 ${CHAT_COMPOSER_SURFACE_CLASS}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
      >
        <ChatComposerInputView
          focusKey={chatId}
          text={text}
          canSend={canSend}
          sending={isSending}
          busy={isUploading || isParsingAudio || Boolean(pendingAudioDraft)}
          hasAttachment={Boolean(pendingUpload || pendingTrack)}
          editing={Boolean(editing)}
          disabled={disabled || Boolean(pendingAudioDraft)}
          onTextChange={onTextChange}
          onSubmit={onSend}
          onImageSelected={handleImageFile}
          onAudioSelected={handleAudioFileSelected}
          onPastedFile={handlePastedFile}
          onVoiceRecorded={(file, duration, mode) => void handleVoiceRecorded(file, duration, mode)}
          onPickMusic={() => setMusicSheetOpen(true)}
          onError={setError}
          customEmojis={customEmojis}
        />
      </form>
      {text.length >= 800 ? <span className="mt-1 block text-right text-[10px] tabular-nums text-[var(--app-muted)]">{text.length}/1000</span> : null}
    </ChatComposerFrame>
  );
}
