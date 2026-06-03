"use client";

import { useEffect, useRef } from "react";

import { readStoredVolume } from "@/lib/player/volume-storage";
import { usePlayerStore } from "@/stores/player.store";

/** Единственный HTMLAudioElement на всё приложение. */
export function AudioPlayerProvider() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const next = usePlayerStore((s) => s.next);
  useEffect(() => {
    usePlayerStore.setState({ volume: readStoredVolume() });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    if (audio.src !== current.streamUrl) {
      audio.src = current.streamUrl;
      audio.load();
    }
  }, [current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      audio.pause();
      return;
    }
    if (isPlaying) {
      void audio.play().catch(() => {
        usePlayerStore.getState().pause();
      });
    } else {
      audio.pause();
    }
  }, [current, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  return (
    <audio
      ref={audioRef}
      data-voople-audio=""
      preload="metadata"
      className="hidden"
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      onDurationChange={(e) => {
        const d = e.currentTarget.duration;
        if (Number.isFinite(d) && d > 0) setDuration(d);
      }}
      onEnded={() => next()}
    />
  );
}
