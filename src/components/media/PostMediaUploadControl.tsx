"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils";
import { POST_MEDIA_LIMITS } from "@/lib/post-media";
import type { PostMediaUploadsController } from "@/hooks/usePostMediaUploads";

export function PostMediaUploadControl({
  uploads,
  className,
  disabled = false,
}: {
  uploads: PostMediaUploadsController;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { uploadFiles } = uploads;
  const add = useCallback((files: FileList | File[]) => void uploadFiles(Array.from(files)), [uploadFiles]);

  useEffect(() => {
    const onPaste = (event: globalThis.ClipboardEvent) => {
      if (disabled) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) add(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add, disabled]);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) add(event.dataTransfer.files);
  };

  return (
    <div
      className={cn("rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] p-3", dragging && "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]", className)}
      onDragEnter={() => !disabled && setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Фото, GIF и видео</p>
          <p className="text-xs text-[var(--app-muted)]">До {POST_MEDIA_LIMITS.maxItems} файлов · перетащите или вставьте Ctrl+V</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || uploads.items.length >= POST_MEDIA_LIMITS.maxItems} className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--app-surface-hover)] disabled:opacity-50">
          <ImagePlus className="h-4 w-4" /> Добавить
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(event) => { if (event.target.files) add(event.target.files); event.target.value = ""; }} />
      </div>
      {uploads.items.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {uploads.items.map((item, index) => (
            <div key={item.clientId} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--app-border)] bg-black/30">
              {item.mediaType === "video" || item.fileName.match(/\.(mp4|webm)$/i) ? <video src={item.previewUrl} className="h-full w-full object-cover" muted /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.fileName} className="h-full w-full object-cover" />
              )}
              {item.status !== "ready" ? <span className="absolute inset-0 grid place-items-center bg-black/55 text-white">{item.status === "error" ? <span className="px-2 text-center text-xs text-red-200">{item.error}</span> : <Loader2 className="animate-spin" />}</span> : null}
              {item.status === "uploading" ? <span className="absolute bottom-0 left-0 h-1 bg-[var(--theme-accent)] transition-[width]" style={{ width: `${item.progress}%` }} /> : null}
              <div className="absolute bottom-1 left-1 flex gap-1">
                <button type="button" disabled={index === 0} onClick={() => uploads.move(item.clientId, -1)} className="rounded bg-black/65 p-1 text-white disabled:opacity-30" aria-label="Сдвинуть влево"><ArrowLeft className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={index === uploads.items.length - 1} onClick={() => uploads.move(item.clientId, 1)} className="rounded bg-black/65 p-1 text-white disabled:opacity-30" aria-label="Сдвинуть вправо"><ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" onClick={() => uploads.remove(item.clientId)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label="Удалить вложение"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
