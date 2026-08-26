"use client";

import { useCallback, useEffect } from "react";

export function configureScreenVideo(element: HTMLVideoElement) {
  element.autoplay = true;
  element.playsInline = true;
  element.className = "block h-full max-h-full w-full max-w-full bg-black object-contain";
  element.style.objectFit = "contain";
  element.style.objectPosition = "center";
}

export function createLocalScreenTile(
  element: HTMLVideoElement,
  kind: "browser" | "native",
) {
  const tile = document.createElement("div");
  tile.dataset.livekitLocalScreen = "true";
  tile.dataset.livekitLocalScreenKind = kind;
  tile.className = "relative grid h-full min-h-0 w-full min-w-0 place-items-center overflow-hidden bg-black";

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
