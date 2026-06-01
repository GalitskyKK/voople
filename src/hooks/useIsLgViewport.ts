"use client";

import { useSyncExternalStore } from "react";

function subscribeLgViewport(onChange: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 1024px)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getLgViewportSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

/** SSR: mobile-first — window scroll на профиле до гидрации. */
function getLgViewportServerSnapshot() {
  return false;
}

export function useIsLgViewport() {
  return useSyncExternalStore(
    subscribeLgViewport,
    getLgViewportSnapshot,
    getLgViewportServerSnapshot,
  );
}
