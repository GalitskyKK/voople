import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chatAttachmentKindFromKey } from "@/lib/object-storage";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";
import type { ChatPendingUpload } from "@/types/chat";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

type DesktopChatUploadOptions = {
  purpose?: "voice" | "circle";
  durationSeconds?: number;
};

export function useDesktopChatUpload(
  config: DesktopConfig,
  session: Session,
  chatId: string,
) {
  const [upload, setUpload] = useState<ChatPendingUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<ChatPendingUpload | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

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
    async (file: File, options?: DesktopChatUploadOptions) => {
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      setError(null);
      try {
        parseChatUploadMime(contentType);
      } catch (parseError) {
        setError(
          parseError instanceof Error
            ? parseError.message
            : "Формат файла не поддерживается",
        );
        return null;
      }

      if (file.size <= 0 || file.size > 100 * 1024 * 1024) {
        setError("Файл должен быть не больше 100 МБ");
        return null;
      }

      setUploading(true);
      try {
        const presigned = (await client.mutation("upload.createPresigned", {
          purpose: "chat",
          contentType,
          sizeBytes: file.size,
          chatMediaKind: options?.purpose,
          chatId,
        })) as { key?: string; uploadUrl?: string };
        if (!presigned.key || !presigned.uploadUrl) {
          throw new Error("Сервер не подготовил загрузку");
        }

        await uploadPresignedFile({
          url: presigned.uploadUrl,
          file,
          contentType,
        });

        const nextUpload: ChatPendingUpload = {
          mediaKey: presigned.key,
          kind: chatAttachmentKindFromKey(presigned.key),
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
    [chatId, clear, client],
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
