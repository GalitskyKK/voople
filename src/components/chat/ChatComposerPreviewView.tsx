"use client";

import { X } from "lucide-react";

import type { ChatMessageView, ChatPendingUpload } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

import { ChatComposerContextPreview } from "./ChatComposerVisual";

type AudioMetadata = { title: string; artist: string };

export function ChatComposerPreviewView({
  editing,
  replyTo,
  upload,
  track = null,
  editableAudioMetadata = false,
  onCancelEdit,
  onCancelReply,
  onClearUpload,
  onClearTrack,
  onUpdateAudioMetadata,
}: {
  editing: ChatMessageView | null;
  replyTo: ChatMessageView | null;
  upload: ChatPendingUpload | null;
  track?: PlaylistTrackView | null;
  editableAudioMetadata?: boolean;
  onCancelEdit: () => void;
  onCancelReply: () => void;
  onClearUpload: () => void;
  onClearTrack?: () => void;
  onUpdateAudioMetadata?: (value: AudioMetadata) => void;
}) {
  return (
    <>
      {editing ? (
        <ChatComposerContextPreview
          label="Редактирование"
          text={editing.text ?? ""}
          accent
          onClose={onCancelEdit}
        />
      ) : null}
      {replyTo ? (
        <ChatComposerContextPreview
          label="Ответ"
          text={replyTo.text?.trim() || "Вложение"}
          onClose={onCancelReply}
        />
      ) : null}

      {upload ? (
        <div className="voople-chat-composer__pending mb-2 flex items-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm">
          {upload.kind === "image" && upload.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- shared browser/Tauri object URL
            <img
              src={upload.previewUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded object-cover"
            />
          ) : null}
          {upload.kind === "circle" && upload.previewUrl ? (
            <video
              src={upload.previewUrl}
              muted
              playsInline
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : null}
          {upload.kind === "audio" && editableAudioMetadata ? (
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-[var(--app-muted)]">
                <span>Название</span>
                <input
                  value={upload.title ?? ""}
                  maxLength={100}
                  className="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--theme-accent)]"
                  onChange={(event) =>
                    onUpdateAudioMetadata?.({
                      title: event.target.value,
                      artist: upload.artist ?? "",
                    })
                  }
                />
              </label>
              <label className="grid gap-1 text-xs text-[var(--app-muted)]">
                <span>Исполнитель</span>
                <input
                  value={upload.artist ?? ""}
                  maxLength={100}
                  className="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--theme-accent)]"
                  onChange={(event) =>
                    onUpdateAudioMetadata?.({
                      title: upload.title ?? "",
                      artist: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--theme-accent)]">
                {upload.kind === "circle"
                  ? "Кружок"
                  : upload.kind === "image"
                    ? "Изображение"
                    : "Аудио"}
              </p>
              <span className="block truncate text-[var(--app-muted)]">
                {upload.kind === "audio"
                  ? `${upload.title ?? upload.fileName} · ${upload.artist ?? "…"}`
                  : upload.fileName}
              </span>
            </div>
          )}
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--app-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
            onClick={onClearUpload}
            aria-label="Убрать вложение"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {track ? (
        <div className="voople-chat-composer__pending mb-2 flex items-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm">
          <span className="text-[var(--theme-accent)]">♪</span>
          <span className="min-w-0 flex-1 truncate">
            {track.title} · {track.artist}
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--app-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
            onClick={onClearTrack}
            aria-label="Убрать трек"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
