"use client";

import { useCallback, useState } from "react";

import { chatAttachmentKindFromKey } from "@/lib/object-storage";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatUploadKind } from "@/lib/object-storage/chat-mime";

export type PendingChatUpload = {
  mediaKey: string;
  kind: ChatUploadKind;
  previewUrl: string | null;
  fileName: string;
  title?: string;
  artist?: string;
  durationSeconds?: number | null;
};

export type PendingChatAudioDraft = {
  file: File;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

async function uploadViaServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload/chat", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => null)) as { key?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Ошибка загрузки (${response.status})`);
  }

  if (!payload?.key) {
    throw new Error("Сервер не вернул ключ файла");
  }

  return payload.key;
}

export function useChatUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<PendingChatUpload | null> => {
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
      const mediaKey = await uploadViaServer(file);
      const resolvedKind = chatAttachmentKindFromKey(mediaKey);
      const previewUrl = resolvedKind === "image" ? URL.createObjectURL(file) : null;

      return {
        mediaKey,
        kind: resolvedKind,
        previewUrl,
        fileName: file.name,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка загрузки";
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    uploadFile,
    isUploading,
    error,
    setError,
  };
}
