"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { TrackMetadataConfirmCard } from "@/components/player/TrackMetadataConfirmCard";
import type { TrackMetadataDraft } from "@/lib/player/metadata";

type ChatTrackMetadataDialogProps = {
  open: boolean;
  initialTitle: string;
  initialArtist: string;
  heading?: string;
  confirmLabel?: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (draft: TrackMetadataDraft) => void;
};

export function ChatTrackMetadataDialog({
  open,
  initialTitle,
  initialArtist,
  heading = "Добавить в плейлист",
  confirmLabel = "В плейлист",
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ChatTrackMetadataDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-md)]"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className="rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <TrackMetadataConfirmCard
          initialTitle={initialTitle}
          initialArtist={initialArtist}
          heading={heading}
          confirmLabel={confirmLabel}
          isSubmitting={isSubmitting}
          error={error}
          onCancel={onClose}
          onConfirm={onConfirm}
          className="border-0 bg-transparent p-0"
        />
      </div>
    </div>,
    document.body,
  );
}
