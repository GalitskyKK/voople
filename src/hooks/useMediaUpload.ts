"use client";

import { useCallback, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { UploadPurpose } from "@/lib/object-storage/types";
import type { PostMediaType } from "@/types/domain";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

export type UploadedMedia = {
  mediaKey: string;
  mediaType: PostMediaType;
  previewUrl: string;
};

async function readVideoDuration(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error("Не удалось прочитать видео"));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useMediaUpload(purpose: UploadPurpose) {
  const [uploaded, setUploaded] = useState<UploadedMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presign = trpc.upload.createPresigned.useMutation();

  const reset = useCallback(() => {
    setUploaded(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (file: File, options?: { asCircle?: boolean }): Promise<UploadedMedia | null> => {
      setError(null);
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      const videoAllowed = purpose === "post" && VIDEO_MIME.has(contentType);
      if (!IMAGE_MIME.has(contentType) && !videoAllowed) {
        setError(
          purpose === "post"
            ? "Допустимы JPEG, PNG, WebP, GIF, MP4 или WebM"
            : "Допустимы только JPEG, PNG, WebP или GIF",
        );
        return null;
      }

      if (options?.asCircle && !videoAllowed) {
        setError("Для кружка выберите MP4 или WebM");
        return null;
      }

      setIsUploading(true);
      try {
        if (options?.asCircle) {
          const duration = await readVideoDuration(file);
          if (!Number.isFinite(duration) || duration <= 0 || duration > 60) {
            throw new Error("Кружок должен быть не длиннее 60 секунд");
          }
        }

        const presigned = await presign.mutateAsync({
          purpose,
          contentType,
          sizeBytes: file.size,
        });

        const response = await fetch(presigned.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });

        if (!response.ok) throw new Error("Не удалось загрузить файл");
        if (!presigned.mediaType || !presigned.publicUrl) {
          throw new Error("Неподдерживаемый тип файла");
        }

        const result: UploadedMedia = {
          mediaKey: presigned.key,
          mediaType:
            options?.asCircle && presigned.mediaType === "video"
              ? "circle"
              : presigned.mediaType,
          previewUrl: presigned.publicUrl,
        };
        setUploaded(result);
        return result;
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Ошибка загрузки");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [presign, purpose],
  );

  return { uploaded, isUploading, error, uploadFile, reset, setError };
}
