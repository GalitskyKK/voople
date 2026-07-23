"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { formatPlaybackTime } from "@/lib/player/format";

export function ChatAttachmentCircle({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackError(false);
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setPlaybackError(true);
      setPlaying(false);
    }
  };

  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); void toggle(); }} className="group relative h-48 w-48 max-w-[70vw] overflow-hidden rounded-full bg-black shadow-[0_10px_32px_rgba(0,0,0,.3)]" aria-label={playing ? "Пауза" : "Воспроизвести кружок"}>
      <video
        ref={videoRef}
        src={url}
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPlaybackError(true)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          setCurrentTime(video.currentTime);
          setProgress(video.duration ? video.currentTime / video.duration : 0);
        }}
      />
      <svg className="pointer-events-none absolute inset-1 -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgb(255 255 255 / .16)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      </svg>
      <span className="absolute inset-0 grid place-items-center bg-black/5 transition group-hover:bg-black/15">
        <span className={playing ? "grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100" : "grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"}>{playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}</span>
      </span>
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] tabular-nums text-white backdrop-blur-sm">
        {playbackError ? "Ошибка" : formatPlaybackTime(currentTime)}
      </span>
    </button>
  );
}
