import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";
import type { DesktopUploadedMedia } from "./useDesktopMediaUpload";

export function DesktopMediaDropzone({
  error,
  media,
  onRemove,
  onUpload,
  uploading,
  compact = false,
}: {
  error: string | null;
  media: DesktopUploadedMedia | null;
  onRemove: () => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const choose = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files);
  };

  if (media) {
    return (
      <div
        className={cn(
          "composer-preview",
          compact && "composer-preview--compact",
        )}
      >
        {media.mediaType === "video" ? (
          <video src={media.previewUrl} controls preload="metadata" />
        ) : (
          <img src={media.previewUrl} alt="Предпросмотр вложения" />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить вложение"
        >
          <Trash2 size={17} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "composer-dropzone",
          compact && "composer-dropzone--compact",
          dragging && "is-dragging",
        )}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <ImagePlus size={20} />
        <span>
          {uploading
            ? "Загружаем…"
            : compact
              ? "Прикрепить медиа"
              : "Перетащите фото или видео либо выберите файл"}
        </span>
        {!compact ? (
          <small>JPEG, PNG, WebP, GIF, MP4, WebM · до 30 МБ</small>
        ) : null}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        onChange={(event) => choose(event.target.files)}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
