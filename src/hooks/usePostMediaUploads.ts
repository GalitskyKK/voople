"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";
import type { PostMediaView } from "@/types/domain";
import { POST_MEDIA_LIMITS } from "@/lib/post-media";

const ALLOWED_MIME = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

export type PostMediaUpload = {
  clientId: string;
  fileName: string;
  mediaKey?: string;
  mediaType?: PostMediaView["type"];
  previewUrl: string;
  progress: number;
  status: "queued" | "uploading" | "ready" | "error";
  error?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type PostMediaUploadInput = {
  mediaKey: string;
  mediaType: PostMediaView["type"];
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type PostMediaUploadsController = {
  items: PostMediaUpload[];
  media: PostMediaUploadInput[];
  busy: boolean;
  move: (clientId: string, delta: number) => void;
  remove: (clientId: string) => void;
  reset: () => void;
  uploadFiles: (files: File[]) => Promise<void>;
  restore: (media: Array<PostMediaUploadInput & { url: string }>) => void;
};

async function readMediaMetadata(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      return await new Promise<{ width?: number; height?: number; durationSeconds?: number }>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => resolve({
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
          durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
        });
        video.onerror = () => resolve({});
        video.src = objectUrl;
      });
    }
    return await new Promise<{ width?: number; height?: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth || undefined, height: image.naturalHeight || undefined });
      image.onerror = () => resolve({});
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function usePostMediaUploads() {
  const [items, setItems] = useState<PostMediaUpload[]>([]);
  const itemsRef = useRef(items);
  const presign = trpc.upload.createPresigned.useMutation();

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
    for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    const remaining = Math.max(0, POST_MEDIA_LIMITS.maxItems - itemsRef.current.length);
    const accepted = files.slice(0, remaining);
    const queued = accepted.map((file) => ({
      clientId: crypto.randomUUID(),
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: "queued" as const,
      file,
    }));
    setItems((current) => [...current, ...queued.map((queuedItem) => ({
      clientId: queuedItem.clientId,
      fileName: queuedItem.fileName,
      previewUrl: queuedItem.previewUrl,
      progress: queuedItem.progress,
      status: queuedItem.status,
    }))]);

    await Promise.all(queued.map(async ({ file, ...queuedItem }) => {
      const update = (patch: Partial<PostMediaUpload>) => setItems((current) =>
        current.map((item) => item.clientId === queuedItem.clientId ? { ...item, ...patch } : item));
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      if (!ALLOWED_MIME.has(contentType)) {
        update({ status: "error", error: "Неподдерживаемый формат" });
        return;
      }
      try {
        update({ status: "uploading", progress: 10 });
        const metadata = await readMediaMetadata(file);
        const signed = await presign.mutateAsync({ purpose: "post", contentType, sizeBytes: file.size });
        update({ progress: 35 });
        await uploadPresignedFile({
          url: signed.uploadUrl,
          file,
          contentType,
          onProgress: (percent) => update({ progress: 35 + Math.round(percent * 0.65) }),
        });
        if (!signed.mediaType || signed.mediaType === "circle" || !signed.publicUrl) throw new Error("Сервер не принял файл");
        update({
          mediaKey: signed.key,
          mediaType: signed.mediaType,
          previewUrl: signed.publicUrl,
          progress: 100,
          status: "ready",
          ...metadata,
        });
      } catch (error) {
        update({ status: "error", error: error instanceof Error ? error.message : "Ошибка загрузки" });
      }
    }));
  }, [presign]);

  const remove = useCallback((clientId: string) => {
    setItems((current) => {
      const item = current.find((candidate) => candidate.clientId === clientId);
      if (item?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      return current.filter((candidate) => candidate.clientId !== clientId);
    });
  }, []);
  const move = useCallback((clientId: string, delta: number) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.clientId === clientId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    for (const item of itemsRef.current) if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    setItems([]);
  }, []);
  const restore = useCallback((media: Array<PostMediaUploadInput & { url: string }>) => {
    setItems(media.slice(0, POST_MEDIA_LIMITS.maxItems).map((item, index) => ({
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
    })));
  }, []);

  return {
    items,
    media: items.flatMap((item) => item.status === "ready" && item.mediaKey && item.mediaType
      ? [{
        mediaKey: item.mediaKey,
        mediaType: item.mediaType,
        width: item.width,
        height: item.height,
        durationSeconds: item.durationSeconds,
      }]
      : []),
    busy: items.some((item) => item.status === "queued" || item.status === "uploading"),
    move,
    remove,
    reset,
    uploadFiles,
    restore,
  };
}
