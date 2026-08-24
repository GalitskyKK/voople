"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRoomFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, setPending] = useState(false);
  const fullscreenRef = useRef(false);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const ownsNativeFullscreenRef = useRef(false);

  const exitFullscreen = useCallback(async () => {
    generationRef.current += 1;
    fullscreenRef.current = false;
    pendingRef.current = false;
    setFullscreen(false);
    setPending(false);
    if (ownsNativeFullscreenRef.current && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    ownsNativeFullscreenRef.current = false;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (pendingRef.current) return;
    if (fullscreenRef.current) {
      await exitFullscreen();
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    fullscreenRef.current = true;
    pendingRef.current = true;
    setFullscreen(true);
    setPending(true);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        if (!mountedRef.current || generationRef.current !== generation) {
          if (document.fullscreenElement === document.documentElement) {
            await document.exitFullscreen().catch(() => undefined);
          }
          return;
        }
        ownsNativeFullscreenRef.current = true;
      } catch {
        // CSS full-viewport mode remains available in restricted WebViews.
      }
    }
    if (!mountedRef.current || generationRef.current !== generation) return;
    pendingRef.current = false;
    setPending(false);
  }, [exitFullscreen]);

  useEffect(() => {
    const handleChange = () => {
      if (ownsNativeFullscreenRef.current && !document.fullscreenElement) {
        generationRef.current += 1;
        ownsNativeFullscreenRef.current = false;
        fullscreenRef.current = false;
        pendingRef.current = false;
        setFullscreen(false);
        setPending(false);
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      document.removeEventListener("fullscreenchange", handleChange);
      if (ownsNativeFullscreenRef.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") void exitFullscreen();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [exitFullscreen, fullscreen]);

  return { fullscreen, pending, toggleFullscreen, exitFullscreen };
}
