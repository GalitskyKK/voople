"use client";

import { useSyncExternalStore } from "react";
const QUERY = "(hover: none), (pointer: coarse)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
export function useCoarsePointer() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
