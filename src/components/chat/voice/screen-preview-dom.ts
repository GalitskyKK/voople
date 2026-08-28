"use client";

import { useCallback, useEffect } from "react";

export function configureScreenVideo(element: HTMLVideoElement) {
  element.autoplay = true;
  element.playsInline = true;
  element.dataset.voopleScreenVideo = "true";
  element.className = "block h-full min-h-0 w-full min-w-0 max-h-full max-w-full bg-black object-contain";

  // LiveKit creates the video element without presentation dimensions. Let the
  // stage own its rendered box, then preserve the captured surface inside that
  // box. Leaving width/height at `auto` can keep the browser's small default
  // replaced-element size and produce a tiny preview on a large black stage.
  element.style.setProperty("width", "100%", "important");
  element.style.setProperty("height", "100%", "important");
  element.style.setProperty("max-width", "100%", "important");
  element.style.setProperty("max-height", "100%", "important");
  element.style.setProperty("object-fit", "contain", "important");
  element.style.setProperty("object-position", "center", "important");
}

export function createLocalScreenTile(
  element: HTMLVideoElement,
  kind: "browser" | "native",
) {
  const tile = document.createElement("div");
  tile.dataset.livekitLocalScreen = "true";
  tile.dataset.livekitLocalScreenKind = kind;
  tile.className = "relative flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden bg-black";

  const placeholder = document.createElement("div");
  placeholder.dataset.localScreenPlaceholder = "true";
  placeholder.className = "hidden absolute inset-0 grid place-items-center bg-black px-6 text-center text-sm text-white/70";
  placeholder.textContent = "Предпросмотр приостановлен. Демонстрация для участников продолжается.";
  tile.append(element, placeholder);
  return tile;
}

export function findBrowserScreenPreview(container: HTMLDivElement | null) {
  return container?.querySelector<HTMLElement>(
    '[data-livekit-local-screen-kind="browser"]',
  ) ?? null;
}

export function useLocalScreenPreviewVisibility() {
  const sync = useCallback(() => {
    const paused = document.hidden || !document.hasFocus();
    document.querySelectorAll<HTMLElement>("[data-livekit-local-screen]").forEach((tile) => {
      const video = tile.querySelector("video");
      video?.classList.toggle("invisible", paused);
      if (paused) video?.pause();
      else if (video) void video.play().catch(() => undefined);
      tile.querySelector<HTMLElement>("[data-local-screen-placeholder]")
        ?.classList.toggle("hidden", !paused);
    });
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
    };
  }, [sync]);

  return sync;
}
