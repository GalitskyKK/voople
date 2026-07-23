"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { formatPlaybackTime } from "@/lib/player/format";

const WAVEFORM = [9, 15, 11, 22, 17, 26, 13, 19, 28, 16, 23, 12, 25, 18, 10, 21, 15, 27, 13, 20, 9, 17, 24, 12];

export function ChatVoiceMessage({ url, durationLabel }: { url: string; durationLabel: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackError, setPlaybackError] = useState(false);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError(false);
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setPlaybackError(true);
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = value * audio.duration;
    setCurrentTime(audio.currentTime);
    setProgress(value);
  };

  const cyclePlaybackRate = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const totalLabel = duration > 0 ? formatPlaybackTime(duration) : durationLabel;

  return (
    <div className="flex min-w-[14rem] max-w-full items-center gap-2.5 py-0.5" onClick={(event) => event.stopPropagation()}>
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setPlaybackError(true)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
            setCurrentTime(0);
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            setCurrentTime(audio.currentTime);
            setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
          }}
        />
      ) : null}
      <button type="button" onClick={() => void toggle()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--theme-accent)] text-white shadow-sm" aria-label={playing ? "Пауза" : "Слушать голосовое"}>
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative flex h-7 items-center gap-[2px] overflow-hidden">
          {WAVEFORM.map((height, index) => (
            <span
              key={`${height}-${index}`}
              aria-hidden
              className={index / WAVEFORM.length <= progress ? "w-[3px] shrink-0 rounded-full bg-[var(--theme-accent)]" : "w-[3px] shrink-0 rounded-full bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]"}
              style={{ height }}
            />
          ))}
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Перемотать голосовое сообщение"
          />
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-[var(--app-muted)]">
          <span className={playbackError ? "text-red-400" : undefined}>
            {playbackError ? "Не удалось воспроизвести" : `${formatPlaybackTime(currentTime)} / ${totalLabel}`}
          </span>
          <button type="button" onClick={cyclePlaybackRate} className="rounded-md px-1 py-0.5 font-semibold tabular-nums hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]" aria-label="Скорость воспроизведения">
            {playbackRate}×
          </button>
        </div>
      </div>
    </div>
  );
}
