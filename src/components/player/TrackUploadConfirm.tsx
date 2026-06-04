"use client";

import type { TrackMetadataDraft } from "@/lib/player/metadata";

import { TrackMetadataConfirmCard } from "./TrackMetadataConfirmCard";

export type PendingTrackUpload = {
  file: File;
  previewUrl: string;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

type TrackUploadConfirmProps = {
  pending: PendingTrackUpload;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (draft: TrackMetadataDraft) => void;
};

export function TrackUploadConfirm({
  pending,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: TrackUploadConfirmProps) {
  return (
    <TrackMetadataConfirmCard
      initialTitle={pending.title}
      initialArtist={pending.artist}
      heading="Новый трек"
      confirmLabel="Добавить"
      isSubmitting={isSubmitting}
      error={error}
      onCancel={onCancel}
      onConfirm={(draft) =>
        onConfirm({
          ...draft,
          durationSeconds: pending.durationSeconds,
        })
      }
      className="mb-3"
    />
  );
}
