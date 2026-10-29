"use client";
import { useCallback, useSyncExternalStore } from "react";

type Slot = "direct-list" | "direct-create" | "direct-info";
function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
/** A shell-owned data surface can fill a route-owned presentation slot. */
export function useWorkspaceSlot(name: Slot) {
  const getSlot = useCallback(() => document.querySelector<HTMLElement>(`[data-voople-slot="${name}"]`), [name]);
  return useSyncExternalStore(subscribe, getSlot, () => null);
}
