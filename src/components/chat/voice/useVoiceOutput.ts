"use client";

import { useCallback, useRef, useState } from "react";
import type { RemoteTrack } from "livekit-client";

export function useVoiceOutput() {
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const outputMutedRef = useRef(false);
  const [outputMuted, setOutputMuted] = useState(false);

  const attachAudio = useCallback((track: RemoteTrack) => {
    const element = track.attach();
    element.autoplay = true;
    element.muted = outputMutedRef.current;
    element.dataset.livekitAudio = "true";
    audioContainerRef.current?.appendChild(element);
  }, []);

  const clearAudio = useCallback(() => {
    audioContainerRef.current?.replaceChildren();
    outputMutedRef.current = false;
    setOutputMuted(false);
  }, []);

  const toggleOutput = useCallback(() => {
    const next = !outputMutedRef.current;
    outputMutedRef.current = next;
    setOutputMuted(next);
    audioContainerRef.current?.querySelectorAll("audio").forEach((element) => {
      element.muted = next;
    });
  }, []);

  return { audioContainerRef, outputMuted, attachAudio, clearAudio, toggleOutput };
}
