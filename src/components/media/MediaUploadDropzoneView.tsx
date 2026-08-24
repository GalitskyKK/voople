"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";

export type MediaUploadPreview = {
  previewUrl: string;
  mediaType: "image" | "gif" | "meme" | "video" | "circle";
};

export function MediaUploadDropzoneView({
  error,
  media,
  onRemove,
  onUpload,
  uploading,
  compact = false,
  allowVideo = true,
}: {
  error: string | null;
  media: MediaUploadPreview | null;
  onRemove: () => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  compact?: boolean;
  allowVideo?: boolean;
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
      <div className={cn("relative overflow-hidden rounded-xl border border-[var(--app-border)] bg-black/20", compact ? "h-20 w-28" : "max-h-64") }>
        {media.mediaType === "video" || media.mediaType === "circle" ? (
          <video src={media.previewUrl} controls preload="metadata" className="h-full max-h-64 w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- shared local object URL for web and Tauri
          <img src={media.previewUrl} alt="Предпросмотр вложения" className="h-full max-h-64 w-full object-cover" />
        )}
        <button type="button" onClick={onRemove} aria-label="Удалить вложение" className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] p-3 text-left text-sm transition-colors hover:bg-[var(--app-surface-hover)]",
          !compact && "min-h-24 flex-col justify-center text-center",
          dragging && "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]",
        )}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <ImagePlus className="h-5 w-5 shrink-0 text-[var(--theme-accent)]" />
        <span>{uploading ? "Загружаем…" : compact ? "Прикрепить медиа" : allowVideo ? "Перетащите фото или видео либо выберите файл" : "Перетащите изображение либо выберите файл"}</span>
        {!compact ? <small className="text-xs text-[var(--app-muted)]">{allowVideo ? "JPEG, PNG, WebP, GIF, MP4, WebM" : "JPEG, PNG, WebP, GIF"} · до 30 МБ</small> : null}
      </button>
      <input ref={inputRef} className="sr-only" type="file" accept={allowVideo ? "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/gif"} onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </div>
  );
}
