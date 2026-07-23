"use client";

import Image from "next/image";
import { CircleDot, Loader2, Paperclip, Video, X } from "lucide-react";
import { useRef } from "react";
import { useState } from "react";

import { CircleRecorder } from "@/components/media/CircleRecorder";
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
  allowVideo?: boolean;
  showCircleOption?: boolean;
};

export function MediaUploadControl({
  purpose,
  onChange,
  disabled = false,
  className,
  buttonClassName,
  previewClassName,
  allowVideo = purpose === "post",
  showCircleOption = false,
}: MediaUploadControlProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const circleInputRef = useRef<HTMLInputElement>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const { uploaded, isUploading, error, uploadFile, reset } = useMediaUpload(purpose);

  const handleFile = async (file: File | undefined, asCircle = false) => {
    if (!file) return;
    const result = await uploadFile(file, { asCircle });
    if (result) onChange(result);
  };

  const handleRemove = () => {
    reset();
    onChange(null);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
    if (circleInputRef.current) circleInputRef.current.value = "";
  };

  const disabledNow = disabled || isUploading;
  const mediaAccept = allowVideo
    ? "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
    : "image/jpeg,image/png,image/webp,image/gif";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => !disabledNow && mediaInputRef.current?.click()}
          disabled={disabledNow}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-[color-mix(in_srgb,var(--foreground)_52%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_78%,transparent)] disabled:cursor-default disabled:opacity-50",
            buttonClassName,
          )}
          aria-label={allowVideo ? "Прикрепить фото или видео" : "Прикрепить изображение"}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : allowVideo ? <Video className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
          {allowVideo ? "Фото или видео" : "Фото"}
        </button>
        <input
          ref={mediaInputRef}
          type="file"
          accept={mediaAccept}
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />

        {showCircleOption && allowVideo && (
          <>
            <button
              type="button"
              onClick={() => {
                if (disabledNow) return;
                if (typeof MediaRecorder !== "undefined" && "mediaDevices" in navigator) {
                  setRecorderOpen(true);
                } else {
                  circleInputRef.current?.click();
                }
              }}
              disabled={disabledNow}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-[color-mix(in_srgb,var(--foreground)_52%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_78%,transparent)] disabled:cursor-default disabled:opacity-50"
            >
              <CircleDot className="h-4 w-4" />
              Кружок
            </button>
            <input
              ref={circleInputRef}
              type="file"
              accept="video/mp4,video/webm"
              capture="user"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0], true)}
            />
          </>
        )}

        {isUploading && (
          <span className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
            Загрузка…
          </span>
        )}
      </div>

      {uploaded && (
        <div className={cn("relative w-fit max-w-full", previewClassName)}>
          <PostMediaPreview url={uploaded.previewUrl} mediaType={uploaded.mediaType} />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabledNow}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
            aria-label="Убрать вложение"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      <CircleRecorder
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        onUse={(file) => {
          setRecorderOpen(false);
          void handleFile(file, true);
        }}
      />
    </div>
  );
}

function PostMediaPreview({ url, mediaType }: { url: string; mediaType: UploadedMedia["mediaType"] }) {
  const isVideo = mediaType === "video" || mediaType === "circle";
  return (
    <div
      className={cn(
        "relative max-h-48 overflow-hidden border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/30",
        mediaType === "circle" ? "aspect-square w-40 rounded-full" : "rounded-xl",
      )}
    >
      {isVideo ? (
        <video
          src={url}
          className={cn("max-h-48 w-full object-cover", mediaType === "circle" && "h-full")}
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        <Image
          src={url}
          alt="Превью"
          width={320}
          height={160}
          className="max-h-48 w-auto object-contain"
          unoptimized={mediaType === "gif"}
        />
      )}
    </div>
  );
}
