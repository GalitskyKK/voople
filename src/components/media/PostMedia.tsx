"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { PostMediaType } from "@/types/domain";

import { MediaLightbox } from "./MediaLightbox";

type PostMediaProps = {
  url: string;
  mediaType?: PostMediaType | null;
  className?: string;
  alt?: string;
  /** Открытие на весь экран по клику (лента, комментарии). */
  expandable?: boolean;
};

export function PostMedia({
  url,
  mediaType,
  className,
  alt = "Вложение",
  expandable = true,
}: PostMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const image = (
    <Image
      src={url}
      alt={alt}
      width={800}
      height={600}
      className="max-h-96 w-full object-contain"
      unoptimized={mediaType === "gif"}
    />
  );

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10 bg-black/20",
          className,
        )}
      >
        {expandable ? (
          <button
            type="button"
            className="block w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Открыть изображение"
            onClick={() => setLightboxOpen(true)}
          >
            {image}
          </button>
        ) : (
          image
        )}
      </div>
      {expandable && (
        <MediaLightbox
          url={lightboxOpen ? url : null}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
