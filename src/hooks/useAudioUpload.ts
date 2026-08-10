"use client";

import { useCallback, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { TrackMetadataDraft } from "@/lib/player/metadata";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";

const ALLOWED_AUDIO = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

function assertAudioMime(file: File) {
  const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_AUDIO.has(contentType)) {
    throw new Error("Допустимы MP3, M4A, OGG, WAV или WebM");
  }
  return contentType;
}

export function useAudioUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presign = trpc.upload.createPresigned.useMutation();
  const createTrack = trpc.playlist.createFromUpload.useMutation();

  const confirmUpload = useCallback(
    async (
      file: File,
      draft: TrackMetadataDraft,
      options?: { pinToProfile?: boolean },
    ) => {
      setError(null);
      const contentType = assertAudioMime(file);

      setIsUploading(true);
      try {
        const presigned = await presign.mutateAsync({
          purpose: "track",
          contentType,
          sizeBytes: file.size,
        });

        await uploadPresignedFile({ url: presigned.uploadUrl, file, contentType });

        return await createTrack.mutateAsync({
          fileKey: presigned.key,
          title: draft.title,
          artist: draft.artist,
          durationSeconds: draft.durationSeconds,
          pinToProfile: options?.pinToProfile ?? true,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ошибка загрузки";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [createTrack, presign],
  );

  return {
    confirmUpload,
    isUploading: isUploading || presign.isPending || createTrack.isPending,
    error,
    setError,
  };
}
