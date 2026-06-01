"use client";

import { useCallback, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { UploadPurpose } from "@/lib/object-storage/types";
import type { PostMediaType } from "@/types/domain";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type UploadedMedia = {
  mediaKey: string;
  mediaType: PostMediaType;
  previewUrl: string;
};

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
    async (file: File): Promise<UploadedMedia | null> => {
      setError(null);
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      if (!ALLOWED_MIME.has(contentType)) {
        setError("Допустимы только JPEG, PNG, WebP или GIF");
        return null;
      }

      setIsUploading(true);
      try {
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

        if (!response.ok) {
          throw new Error("Не удалось загрузить файл");
        }

        const result: UploadedMedia = {
          mediaKey: presigned.key,
          mediaType: presigned.mediaType,
          previewUrl: presigned.publicUrl,
        };
        setUploaded(result);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ошибка загрузки";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [presign, purpose],
  );

  return { uploaded, isUploading, error, uploadFile, reset, setError };
}
