"use client";

import { useSyncExternalStore } from "react";

function getRoot() {
  return window.matchMedia("(min-width: 1024px)").matches
    ? document.getElementById("voople-sidebar-session-root") : null;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", onChange);
  // A route may replace its shell while the application-wide call survives.
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => { media.removeEventListener("change", onChange); observer.disconnect(); };
}

export function useVoiceSidebarRoot() {
  return useSyncExternalStore(subscribe, getRoot, () => null);
}
