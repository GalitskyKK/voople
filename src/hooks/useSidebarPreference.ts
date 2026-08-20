"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "voople:sidebar-collapsed:v1";
const PREFERENCE_EVENT = "voople:sidebar-preference";

function getCollapsedSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PREFERENCE_EVENT, onChange);
  };
}

export function useSidebarPreference() {
  const collapsed = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot);
  const setCollapsed = useCallback((value: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(value));
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--voople-sidebar-width",
      collapsed ? "72px" : "216px",
    );
    document.documentElement.dataset.sidebarCollapsed = collapsed ? "true" : "false";
  }, [collapsed]);

  return { collapsed, setCollapsed };
}
