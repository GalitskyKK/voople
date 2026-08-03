import { X } from "lucide-react";

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
        <div className="desktop-chat-composer__preview">
          <div className="min-w-0 flex-1">
            <p>Редактирование</p>
            <span>{editing.text}</span>
          </div>
          <button type="button" onClick={onCancelEdit} aria-label="Отменить редактирование">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {replyTo ? (
        <div className="desktop-chat-composer__preview">
          <div className="min-w-0 flex-1">
            <p>Ответ</p>
            <span>{replyTo.text?.trim() || "Вложение"}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Отменить ответ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {upload ? (
        <div className="desktop-chat-composer__preview">
          {upload.kind === "image" && upload.previewUrl ? (
            <img src={upload.previewUrl} alt="" />
          ) : null}
          {upload.kind === "circle" && upload.previewUrl ? (
            <video
              src={upload.previewUrl}
              muted
              playsInline
              className="rounded-full"
            />
          ) : null}
          {upload.kind === "audio" ? (
            <div className="desktop-chat-composer__audio-fields">
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
              <p>
                {upload.kind === "circle" ? "Кружок" : "Изображение"}
              </p>
              <span>{upload.fileName}</span>
            </div>
          )}
          <button
            type="button"
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
