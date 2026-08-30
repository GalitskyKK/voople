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
  const nativeFullscreenTargetRef = useRef<HTMLElement | null>(null);

  const exitFullscreen = useCallback(async () => {
    generationRef.current += 1;
    fullscreenRef.current = false;
    pendingRef.current = false;
    setFullscreen(false);
    setPending(false);
    if (
      ownsNativeFullscreenRef.current &&
      document.fullscreenElement === nativeFullscreenTargetRef.current
    ) {
      await document.exitFullscreen().catch(() => undefined);
    }
    ownsNativeFullscreenRef.current = false;
    nativeFullscreenTargetRef.current = null;
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
    const target = document.querySelector<HTMLElement>(".desktop-window-content")
      ?? document.documentElement;
    if (!document.fullscreenElement && target.requestFullscreen) {
      try {
        await target.requestFullscreen();
        if (!mountedRef.current || generationRef.current !== generation) {
          if (document.fullscreenElement === target) {
            await document.exitFullscreen().catch(() => undefined);
          }
          return;
        }
        ownsNativeFullscreenRef.current = true;
        nativeFullscreenTargetRef.current = target;
      } catch {
        // CSS full-viewport mode remains available in restricted WebViews.
      }
    }
    if (!mountedRef.current || generationRef.current !== generation) return;
    pendingRef.current = false;
    setPending(false);
  }, [exitFullscreen]);

  useEffect(() => {
    // React can intentionally replay an effect setup after its cleanup. Reset
    // the lifecycle guard so a later user-initiated fullscreen request is not
    // mistaken for work completed after an actual unmount.
    mountedRef.current = true;
    const handleChange = () => {
      if (ownsNativeFullscreenRef.current && !document.fullscreenElement) {
        generationRef.current += 1;
        ownsNativeFullscreenRef.current = false;
        nativeFullscreenTargetRef.current = null;
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
      if (
        ownsNativeFullscreenRef.current &&
        document.fullscreenElement === nativeFullscreenTargetRef.current
      ) {
        void document.exitFullscreen().catch(() => undefined);
      }
      ownsNativeFullscreenRef.current = false;
      nativeFullscreenTargetRef.current = null;
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
