import { X } from "lucide-react";

import { ChatComposerContextPreview } from "@/components/chat/ChatComposerVisual";
import type { ChatMessageView, ChatPendingUpload } from "@/types/chat";

export function DesktopChatComposerPreview({
  editing,
  replyTo,
  upload,
  onCancelReply,
  onClearUpload,
  onUpdateAudioMetadata,
  onCancelEdit,
}: {
  editing: ChatMessageView | null;
  replyTo: ChatMessageView | null;
  upload: ChatPendingUpload | null;
  onCancelReply: () => void;
  onClearUpload: () => void;
  onUpdateAudioMetadata: (value: {
    title: string;
    artist: string;
  }) => void;
  onCancelEdit: () => void;
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
          {upload.kind === "audio" ? (
            <div className="desktop-chat-composer__audio-fields min-w-0 flex-1">
              <label>
                <span>Название</span>
                <input
                  value={upload.title ?? ""}
                  maxLength={100}
                  onChange={(event) =>
                    onUpdateAudioMetadata({
                      title: event.target.value,
                      artist: upload.artist ?? "",
                    })
                  }
                />
              </label>
              <label>
                <span>Исполнитель</span>
                <input
                  value={upload.artist ?? ""}
                  maxLength={100}
                  onChange={(event) =>
                    onUpdateAudioMetadata({
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
                {upload.kind === "circle" ? "Кружок" : "Изображение"}
              </p>
              <span className="block truncate text-[var(--app-muted)]">
                {upload.fileName}
              </span>
            </div>
          )}
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]"
            onClick={onClearUpload}
            aria-label="Убрать вложение"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
