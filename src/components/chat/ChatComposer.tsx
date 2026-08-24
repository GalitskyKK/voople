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

import { ChatComposerFormView } from "./ChatComposerFormView";
import { ChatComposerPreviewView } from "./ChatComposerPreviewView";
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
    <>
      <ChatMusicAttachSheet
        open={musicSheetOpen}
        onClose={() => setMusicSheetOpen(false)}
        onSelect={(track) => {
          clearPendingUpload();
          setPendingAudioDraft(null);
          onPendingTrackChange(track);
        }}
      />
      <ChatComposerFormView
        preview={
          <ChatComposerPreviewView
            editing={editing}
            replyTo={replyTo}
            upload={pendingAudioDraft ? null : pendingUpload}
            track={pendingTrack}
            onCancelEdit={() => onEditCancel?.()}
            onCancelReply={onReplyCancel}
            onClearUpload={clearPendingUpload}
            onClearTrack={() => onPendingTrackChange(null)}
          />
        }
        beforeInput={
          pendingAudioDraft ? (
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
          ) : null
        }
        error={pendingAudioDraft ? null : error}
        textLength={text.length}
        onSubmit={onSend}
        input={{
          focusKey: chatId,
          text,
          canSend,
          sending: isSending,
          busy: isUploading || isParsingAudio || Boolean(pendingAudioDraft),
          hasAttachment: Boolean(pendingUpload || pendingTrack),
          editing: Boolean(editing),
          disabled: disabled || Boolean(pendingAudioDraft),
          onTextChange,
          onSubmit: onSend,
          onImageSelected: handleImageFile,
          onAudioSelected: handleAudioFileSelected,
          onPastedFile: handlePastedFile,
          onVoiceRecorded: (file, duration, mode) =>
            void handleVoiceRecorded(file, duration, mode),
          onPickMusic: () => setMusicSheetOpen(true),
          onError: setError,
          customEmojis,
        }}
      />
    </>
  );
}
