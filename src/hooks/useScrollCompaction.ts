"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resolveScrollCompaction } from "@/lib/layout/scroll-compaction";

function getScrollTop(target: Window | HTMLElement) {
  return target === window ? window.scrollY : (target as HTMLElement).scrollTop;
}

/**
 * Compacts a sticky surface while its nearest app scroll region moves down and
 * restores it when the user moves up or returns to the start of the page.
 */
export function useScrollCompaction() {
  const surfaceRef = useRef<HTMLElement>(null);
  const compactRef = useRef(false);
  const scrollTopRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const [compact, setCompactState] = useState(false);

  const setCompact = useCallback((next: boolean) => {
    compactRef.current = next;
    setCompactState(next);
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const scrollRegion = surface.closest<HTMLElement>("[data-voople-scroll]");
    const target: Window | HTMLElement = scrollRegion ?? window;
    scrollTopRef.current = getScrollTop(target);

    const update = () => {
      frameRef.current = null;
      const current = getScrollTop(target);
      const next = resolveScrollCompaction({
        compact: compactRef.current,
        current,
        previous: scrollTopRef.current,
      });

      if (next !== compactRef.current) setCompact(next);
      if (Math.abs(current - scrollTopRef.current) >= 12 || current <= 24) {
        scrollTopRef.current = current;
      }
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [setCompact]);

  const toggleCompact = useCallback(() => setCompact(!compactRef.current), [setCompact]);

  return { surfaceRef, compact, toggleCompact };
}
