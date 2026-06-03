"use client";

import { useCallback, useEffect, useRef } from "react";

import { usePlayerStore } from "@/stores/player.store";

const COLLAPSE_MS = 5000;

/** Развёрнутый мобильный плеер; через 5 с без взаимодействия — компактный режим. */
export function useMobilePlayerAutoCollapse(trackId: string | undefined) {
  const mobileExpanded = usePlayerStore((s) => s.mobilePlayerExpanded);
  const setMobilePlayerExpanded = usePlayerStore((s) => s.setMobilePlayerExpanded);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const touch = useCallback(() => {
    setMobilePlayerExpanded(true);
    clearTimer();
    timerRef.current = setTimeout(() => setMobilePlayerExpanded(false), COLLAPSE_MS);
  }, [clearTimer, setMobilePlayerExpanded]);

  useEffect(() => {
    if (!trackId) {
      clearTimer();
      return;
    }
    setMobilePlayerExpanded(true);
    clearTimer();
    timerRef.current = setTimeout(() => setMobilePlayerExpanded(false), COLLAPSE_MS);
    return clearTimer;
  }, [trackId, clearTimer, setMobilePlayerExpanded]);

  useEffect(() => clearTimer, [clearTimer]);

  return { mobileExpanded, touch };
}
