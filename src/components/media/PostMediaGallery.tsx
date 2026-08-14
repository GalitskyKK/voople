"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { normalizePostMedia } from "@/lib/post-media";
import type { PostMediaView, PostViewModel } from "@/types/domain";

type GalleryPost = Pick<PostViewModel, "id" | "media" | "mediaType" | "mediaUrl">;

function GalleryAsset({ item, className }: { item: PostMediaView; className?: string }) {
  if (item.type === "video") {
    return (
      <video
        src={item.url}
        controls
        playsInline
        preload="metadata"
        className={cn("h-full w-full object-contain", className)}
      />
    );
  }
  // A native image keeps this canonical renderer usable in both Next.js and Tauri.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.url} alt="Вложение публикации" loading="lazy" className={cn("h-full w-full object-cover", className)} />;
}

export function PostMediaGallery({ post, className }: { post: GalleryPost; className?: string }) {
  const items = useMemo(() => normalizePostMedia(post), [post]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visible = items.slice(0, 4);

  if (items.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "grid max-h-[34rem] gap-1 overflow-hidden rounded-xl border border-[var(--app-border)] bg-black/20",
          items.length === 1 ? "grid-cols-1" : "grid-cols-2",
          className,
        )}
      >
        {visible.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "group relative min-h-36 overflow-hidden bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--theme-accent)]",
              items.length === 1 && "h-auto max-h-[34rem]",
              items.length === 3 && index === 0 && "row-span-2",
            )}
            aria-label={`Открыть вложение ${index + 1} из ${items.length}`}
          >
            <GalleryAsset item={item} className={items.length === 1 ? "max-h-[34rem] object-contain" : undefined} />
            {index === 3 && items.length > 4 ? (
              <span className="absolute inset-0 grid place-items-center bg-black/60 text-2xl font-semibold text-white">
                +{items.length - 4}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {activeIndex != null ? (
        <PostGalleryLightbox
          galleryId={post.id}
          items={items}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </>
  );
}

function PostGalleryLightbox({
  galleryId,
  items,
  initialIndex,
  onClose,
}: {
  galleryId: string;
  items: PostMediaView[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const move = useCallback((delta: number) => {
    setIndex((current) => (current + delta + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousUrl = window.location.href;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.history.replaceState(window.history.state, "", previousUrl);
    };
  }, [move, onClose]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("media", `${galleryId}:${index + 1}`);
    window.history.replaceState(window.history.state, "", url);
  }, [galleryId, index]);

  if (typeof document === "undefined") return null;
  const item = items[index];

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Вложение ${index + 1} из ${items.length}`}
      onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <span className="text-sm tabular-nums text-white/70">{index + 1} / {items.length}</span>
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Закрыть галерею">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="absolute inset-4 flex items-center justify-center">
          <GalleryAsset item={item} className="max-h-full max-w-full object-contain" />
        </div>
        {items.length > 1 ? (
          <>
            <button type="button" onClick={() => move(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 hover:bg-black/80" aria-label="Предыдущее вложение"><ChevronLeft /></button>
            <button type="button" onClick={() => move(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 hover:bg-black/80" aria-label="Следующее вложение"><ChevronRight /></button>
          </>
        ) : null}
      </div>
      {items.length > 1 ? (
        <div className="flex h-20 shrink-0 justify-center gap-2 overflow-x-auto px-4 py-2">
          {items.map((thumbnail, thumbnailIndex) => (
            <button key={thumbnail.id} type="button" onClick={() => setIndex(thumbnailIndex)} className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2", thumbnailIndex === index ? "border-[var(--theme-accent)]" : "border-transparent opacity-60")} aria-label={`Вложение ${thumbnailIndex + 1}`}>
              <GalleryAsset item={thumbnail} />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
