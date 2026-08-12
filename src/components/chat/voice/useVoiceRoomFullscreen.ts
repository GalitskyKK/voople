"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRoomFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);
  const ownsNativeFullscreenRef = useRef(false);

  const exitFullscreen = useCallback(async () => {
    setFullscreen(false);
    if (ownsNativeFullscreenRef.current && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    ownsNativeFullscreenRef.current = false;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (fullscreen) {
      await exitFullscreen();
      return;
    }

    setFullscreen(true);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        ownsNativeFullscreenRef.current = true;
      } catch {
        // CSS full-viewport mode remains available in restricted WebViews.
      }
    }
  }, [exitFullscreen, fullscreen]);

  useEffect(() => {
    const handleChange = () => {
      if (ownsNativeFullscreenRef.current && !document.fullscreenElement) {
        ownsNativeFullscreenRef.current = false;
        setFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
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

  return { fullscreen, toggleFullscreen, exitFullscreen };
}
