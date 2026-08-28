"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

type MediaLightboxProps = {
  url: string | null;
  alt?: string;
  onClose: () => void;
};

export function MediaLightbox({ url, alt = "Изображение", onClose }: MediaLightboxProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!url) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [url, onClose]);

  if (!url || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="voople-media-lightbox fixed inset-0 z-[120] flex flex-col bg-black/92"
      role="dialog"
      aria-modal
      aria-label="Просмотр изображения"
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start) return;
        const verticalDistance = event.clientY - start.y;
        const horizontalDistance = Math.abs(event.clientX - start.x);
        if (verticalDistance > 80 && verticalDistance > horizontalDistance) onClose();
      }}
    >
      <button
        type="button"
        className="absolute right-4 top-[max(2rem,env(safe-area-inset-top))] z-10 rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] p-2 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_20%,transparent)]"
        aria-label="Закрыть"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      <button
        type="button"
        className="flex min-h-0 flex-1 items-center justify-center p-4 pt-14"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </button>
    </div>,
    document.body,
  );
}
