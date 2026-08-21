"use client";

import { useCallback, useState } from "react";

import {
  chatAttachmentKindFromKey,
  parseChatUploadMime,
} from "@/lib/object-storage/chat-mime";
import { trpc } from "@/lib/trpc/client";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";
import type { ChatPendingUpload } from "@/types/chat";

export type PendingChatUpload = ChatPendingUpload;

export type PendingChatAudioDraft = {
  file: File;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

export function useChatUpload(chatId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presign = trpc.upload.createPresigned.useMutation();

  const uploadFile = useCallback(async (
    file: File,
    options?: { purpose?: "voice" | "circle" },
  ): Promise<PendingChatUpload | null> => {
    setError(null);
    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!contentType) {
      setError("Неизвестный тип файла");
      return null;
    }

    try {
      parseChatUploadMime(contentType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Формат не поддерживается");
      return null;
    }

    setIsUploading(true);
    try {
      const prepared = await presign.mutateAsync({
        purpose: "chat",
        contentType,
        sizeBytes: file.size,
        chatMediaKind: options?.purpose,
        chatId,
      });
      await uploadPresignedFile({
        url: prepared.uploadUrl,
        file,
        contentType,
      });
      const mediaKey = prepared.key;
      const resolvedKind = chatAttachmentKindFromKey(mediaKey);
      // Keep a local object URL for optimistic playback while the server is
      // producing a short-lived private download URL.
      const previewUrl = URL.createObjectURL(file);

      return {
        mediaKey,
        kind: resolvedKind,
        previewUrl,
        fileName: file.name,
        purpose: options?.purpose,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка загрузки";
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [chatId, presign]);

  return {
    uploadFile,
    isUploading,
    error,
    setError,
  };
}
