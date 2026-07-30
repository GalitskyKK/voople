import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

const ALLOWED_MIME = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

export type DesktopUploadedMedia = {
  mediaKey: string;
  mediaType: "image" | "gif" | "meme" | "video" | "circle";
  previewUrl: string;
};

type PresignedResult = {
  key?: string;
  mediaType?: DesktopUploadedMedia["mediaType"] | null;
  publicUrl?: string | null;
  uploadUrl?: string;
};

export function useDesktopMediaUpload(
  config: DesktopConfig,
  session: Session,
  purpose: "post" | "comment" = "post",
) {
  const [media, setMedia] = useState<DesktopUploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const upload = async (file: File) => {
    const contentType = file.type.split(";")[0]?.toLowerCase() ?? "";
    if (!ALLOWED_MIME.has(contentType)) {
      setError("Допустимы JPEG, PNG, WebP, GIF, MP4 и WebM");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("Файл должен быть не больше 30 МБ");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const presigned = (await client.mutation("upload.createPresigned", {
        contentType,
        purpose,
        sizeBytes: file.size,
      })) as PresignedResult;
      if (!presigned.uploadUrl || !presigned.key || !presigned.publicUrl || !presigned.mediaType) {
        throw new Error("Сервер не подготовил загрузку");
      }
      const response = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!response.ok) throw new Error("Не удалось загрузить файл");
      setMedia({
        mediaKey: presigned.key,
        mediaType: presigned.mediaType,
        previewUrl: presigned.publicUrl,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  return { error, media, remove: () => setMedia(null), upload, uploading };
}
