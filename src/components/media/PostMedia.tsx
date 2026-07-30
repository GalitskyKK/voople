"use client";

import Image from "next/image";
import { useState } from "react";

import type { PostMediaType } from "@/types/domain";
import { MediaLightbox } from "./MediaLightbox";
import { PostMediaVisual } from "./PostMediaVisual";

type PostMediaProps = {
  url: string;
  mediaType?: PostMediaType | null;
  className?: string;
  alt?: string;
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

  return (
    <>
      <PostMediaVisual
        url={url}
        mediaType={mediaType}
        className={className}
        expandable={expandable}
        onImageClick={() => setLightboxOpen(true)}
        image={
          <Image
            src={url}
            alt={alt}
            width={800}
            height={600}
            className="max-h-96 w-full object-contain"
            unoptimized={mediaType === "gif"}
          />
        }
      />
      {expandable && (
        <MediaLightbox url={lightboxOpen ? url : null} alt={alt} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
