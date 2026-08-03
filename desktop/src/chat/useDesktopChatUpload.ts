import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { readJsonResponse } from "@/lib/http/json-response";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatPendingUpload } from "@/types/chat";

import type { DesktopConfig } from "../config";

type ChatUploadResponse = {
  error?: string;
  key?: string;
};

export function useDesktopChatUpload(
  config: DesktopConfig,
  session: Session,
) {
  const [upload, setUpload] = useState<ChatPendingUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<ChatPendingUpload | null>(null);

  const clear = useCallback(() => {
    setUpload((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    uploadRef.current = null;
  }, []);

  useEffect(
    () => () => {
      const previewUrl = uploadRef.current?.previewUrl;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [],
  );

  const uploadFile = useCallback(
    async (
      file: File,
      options?: { purpose?: "voice" | "circle"; durationSeconds?: number },
    ) => {
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      setError(null);
      let parsed: ReturnType<typeof parseChatUploadMime>;
      try {
        parsed = parseChatUploadMime(contentType);
      } catch (parseError) {
        setError(
          parseError instanceof Error
            ? parseError.message
            : "Формат файла не поддерживается",
        );
        return null;
      }

      if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
        setError("Файл должен быть не больше 15 МБ");
        return null;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (options?.purpose) formData.append("purpose", options.purpose);
        const response = await fetch(`${config.apiUrl}/api/upload/chat`, {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await readJsonResponse<ChatUploadResponse>(response);
        if (!response.ok) {
          throw new Error(
            payload?.error ?? `Не удалось загрузить файл (${response.status})`,
          );
        }
        if (!payload?.key) throw new Error("Сервер не вернул ключ файла");

        const nextUpload: ChatPendingUpload = {
          mediaKey: payload.key,
          kind: parsed.kind,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name,
          purpose: options?.purpose,
          durationSeconds: options?.durationSeconds,
          ...(options?.purpose === "voice"
            ? {
                title: "Голосовое сообщение",
                artist: `${options.durationSeconds ?? 1} сек.`,
              }
            : {}),
        };
        clear();
        uploadRef.current = nextUpload;
        setUpload(nextUpload);
        return nextUpload;
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Ошибка загрузки",
        );
        return null;
      } finally {
        setUploading(false);
      }
    },
    [clear, config.apiUrl, session.access_token],
  );

  const updateAudioMetadata = useCallback(
    (metadata: { title: string; artist: string }) => {
      setUpload((current) =>
        current?.kind === "audio" ? { ...current, ...metadata } : current,
      );
    },
    [],
  );

  return {
    clear,
    error,
    setError,
    updateAudioMetadata,
    upload,
    uploadFile,
    uploading,
  };
}
