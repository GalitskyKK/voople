"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { PostMediaType } from "@/types/domain";
import { MediaLightbox } from "./MediaLightbox";

type PostMediaProps = {
  url: string;
  mediaType?: PostMediaType | null;
  className?: string;
  alt?: string;
  expandable?: boolean;
};

function CircleVideo({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className="group relative mx-auto block aspect-square w-[min(15rem,78vw)] overflow-hidden rounded-full border-2 border-[color-mix(in_srgb,var(--theme-accent)_55%,transparent)] bg-black shadow-[0_12px_36px_rgb(0_0_0/0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
      aria-label={playing ? "Приостановить кружок" : "Воспроизвести кружок"}
    >
      <video
        ref={videoRef}
        src={url}
        className="h-full w-full object-cover"
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <span className={cn(
        "absolute inset-0 grid place-items-center bg-black/18 transition-opacity",
        playing ? "opacity-0 group-hover:opacity-100" : "opacity-100",
      )}>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </span>
      </span>
    </button>
  );
}

export function PostMedia({
  url,
  mediaType,
  className,
  alt = "Вложение",
  expandable = true,
}: PostMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (mediaType === "circle") {
    return <div className={className}><CircleVideo url={url} /></div>;
  }

  if (mediaType === "video") {
    return (
      <div className={cn("relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black", className)}>
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[32rem] w-full object-contain"
        />
      </div>
    );
  }

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
      <div className={cn("relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/20", className)}>
        {expandable ? (
          <button
            type="button"
            className="block w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Открыть изображение"
            onClick={() => setLightboxOpen(true)}
          >
            {image}
          </button>
        ) : image}
      </div>
      {expandable && (
        <MediaLightbox url={lightboxOpen ? url : null} alt={alt} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
