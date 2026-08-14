import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

import type { PostMediaUpload, PostMediaUploadsController } from "@/hooks/usePostMediaUploads";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";
import { POST_MEDIA_LIMITS } from "@/lib/post-media";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

const ALLOWED_MIME = new Set(["image/gif", "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

type PresignedResult = {
  key?: string;
  mediaType?: "image" | "gif" | "meme" | "video" | "circle" | null;
  publicUrl?: string | null;
  uploadUrl?: string;
};

export function useDesktopPostMediaUploads(config: DesktopConfig, session: Session): PostMediaUploadsController {
  const [items, setItems] = useState<PostMediaUpload[]>([]);
  const client = useMemo(() => createDesktopTrpcClient(config, () => session.access_token), [config, session.access_token]);

  const uploadFiles = async (files: File[]) => {
    const accepted = files.slice(0, Math.max(0, POST_MEDIA_LIMITS.maxItems - items.length));
    const queued = accepted.map((file) => ({
      file,
      item: {
        clientId: crypto.randomUUID(),
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "queued" as const,
      },
    }));
    setItems((current) => [...current, ...queued.map(({ item }) => item)]);
    await Promise.all(queued.map(async ({ file, item }) => {
      const update = (patch: Partial<PostMediaUpload>) => setItems((current) => current.map((candidate) => candidate.clientId === item.clientId ? { ...candidate, ...patch } : candidate));
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      if (!ALLOWED_MIME.has(contentType)) return update({ status: "error", error: "Неподдерживаемый формат" });
      try {
        update({ status: "uploading", progress: 10 });
        const signed = await client.mutation("upload.createPresigned", { purpose: "post", contentType, sizeBytes: file.size }) as PresignedResult;
        if (!signed.uploadUrl || !signed.key || !signed.publicUrl || !signed.mediaType || signed.mediaType === "circle") throw new Error("Сервер не принял файл");
        await uploadPresignedFile({ url: signed.uploadUrl, file, contentType, onProgress: (progress) => update({ progress }) });
        update({ mediaKey: signed.key, mediaType: signed.mediaType, previewUrl: signed.publicUrl, progress: 100, status: "ready" });
      } catch (error) {
        update({ status: "error", error: error instanceof Error ? error.message : "Ошибка загрузки" });
      }
    }));
  };

  return {
    items,
    media: items.flatMap((item) => item.status === "ready" && item.mediaKey && item.mediaType ? [{ mediaKey: item.mediaKey, mediaType: item.mediaType }] : []),
    busy: items.some((item) => item.status === "queued" || item.status === "uploading"),
    uploadFiles,
    remove: (clientId) => setItems((current) => current.filter((item) => item.clientId !== clientId)),
    move: (clientId, delta) => setItems((current) => {
      const index = current.findIndex((item) => item.clientId === clientId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    }),
    reset: () => setItems([]),
    restore: (media) => setItems(media.slice(0, POST_MEDIA_LIMITS.maxItems).map((item, index) => ({
      clientId: `draft-${index}-${item.mediaKey}`,
      fileName: item.mediaKey.split("/").pop() ?? `file-${index + 1}`,
      mediaKey: item.mediaKey,
      mediaType: item.mediaType,
      previewUrl: item.url,
      progress: 100,
      status: "ready",
      width: item.width,
      height: item.height,
      durationSeconds: item.durationSeconds,
    }))),
  };
}
