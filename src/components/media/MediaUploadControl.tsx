"use client";

import { useRef } from "react";
import Image from "next/image";
import { Loader2, Paperclip, X } from "lucide-react";

import { useMediaUpload, type UploadedMedia } from "@/hooks/useMediaUpload";
import type { UploadPurpose } from "@/lib/object-storage/types";
import { cn } from "@/lib/utils";

type MediaUploadControlProps = {
  purpose: UploadPurpose;
  onChange: (media: UploadedMedia | null) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  previewClassName?: string;
};

export function MediaUploadControl({
  purpose,
  onChange,
  disabled = false,
  className,
  buttonClassName,
  previewClassName,
}: MediaUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploaded, isUploading, error, uploadFile, reset } = useMediaUpload(purpose);

  const handlePick = () => {
    if (disabled || isUploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) onChange(result);
  };

  const handleRemove = () => {
    reset();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePick}
          disabled={disabled || isUploading}
          className={cn(
            "rounded-lg p-2 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] disabled:cursor-default disabled:opacity-50",
            buttonClassName,
          )}
          aria-label="Прикрепить изображение"
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        {isUploading && <span className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">Загрузка…</span>}
      </div>

      {uploaded && (
        <div className={cn("relative w-fit max-w-full", previewClassName)}>
          <PostMediaPreview url={uploaded.previewUrl} mediaType={uploaded.mediaType} />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-[var(--foreground)] hover:bg-black"
            aria-label="Убрать вложение"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function PostMediaPreview({
  url,
  mediaType,
}: {
  url: string;
  mediaType: UploadedMedia["mediaType"];
}) {
  return (
    <div className="relative max-h-40 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/20">
      <Image
        src={url}
        alt="Превью"
        width={320}
        height={160}
        className="max-h-40 w-auto object-contain"
        unoptimized={mediaType === "gif"}
      />
    </div>
  );
}
