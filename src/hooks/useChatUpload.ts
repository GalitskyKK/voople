"use client";

import { useCallback, useState } from "react";

import { readJsonResponse } from "@/lib/http/json-response";
import { chatAttachmentKindFromKey } from "@/lib/object-storage";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatPendingUpload } from "@/types/chat";

export type PendingChatUpload = ChatPendingUpload;

export type PendingChatAudioDraft = {
  file: File;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

async function uploadViaServer(file: File, purpose?: "voice" | "circle"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (purpose) formData.append("purpose", purpose);

  const response = await fetch("/api/upload/chat", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = await readJsonResponse<{ key?: string; error?: string }>(response);

  if (!response.ok) {
    throw new Error(payload?.error ?? `Ошибка загрузки (${response.status})`);
  }

  if (!payload?.key) {
    throw new Error(payload?.error ?? "Сервер не вернул ключ файла");
  }

  return payload.key;
}

export function useChatUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const mediaKey = await uploadViaServer(file, options?.purpose);
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
  }, []);

  return {
    uploadFile,
    isUploading,
    error,
    setError,
  };
}
