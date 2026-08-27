"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  COMPACT_SIDEBAR_WIDTH,
  EXPANDED_SIDEBAR_WIDTH,
  resolveSidebarCollapsed,
  SIDEBAR_PREFERENCE_EVENT,
  SIDEBAR_PREFERENCE_STORAGE_KEY,
} from "@/lib/layout/sidebar-preference";

let inMemoryCollapsed = true;

function getCollapsedSnapshot() {
  try {
    const storedValue = window.localStorage.getItem(
      SIDEBAR_PREFERENCE_STORAGE_KEY,
    );
    return storedValue === null
      ? inMemoryCollapsed
      : resolveSidebarCollapsed(storedValue);
  } catch {
    return inMemoryCollapsed;
  }
}

function getServerSnapshot() {
  return true;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_PREFERENCE_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, onChange);
  };
}

export function useSidebarPreference({
  forceExpanded = false,
}: { forceExpanded?: boolean } = {}) {
  const preferredCollapsed = useSyncExternalStore(
    subscribe,
    getCollapsedSnapshot,
    getServerSnapshot,
  );
  const collapsed = forceExpanded ? false : preferredCollapsed;
  const setCollapsed = useCallback((value: boolean) => {
    inMemoryCollapsed = value;
    try {
      window.localStorage.setItem(
        SIDEBAR_PREFERENCE_STORAGE_KEY,
        String(value),
      );
    } catch {
      // The in-memory preference still keeps both mounted shells in sync.
    }
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--voople-sidebar-width",
      collapsed ? COMPACT_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH,
    );
    document.documentElement.dataset.sidebarCollapsed = collapsed ? "true" : "false";
  }, [collapsed]);

  return { collapsed, setCollapsed };
}
