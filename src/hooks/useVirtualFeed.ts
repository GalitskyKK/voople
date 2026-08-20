"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";

import type { ScrollContainerMode } from "@/components/layout/ScrollContainerContext";

const ESTIMATED_POST_HEIGHT = 160;

function measureScrollMargin(
  listAnchor: HTMLElement,
  mode: ScrollContainerMode,
) {
  if (mode === "window") {
    const rect = listAnchor.getBoundingClientRect();
    return rect.top + window.scrollY;
  }

  return listAnchor.offsetTop;
}

export function useVirtualFeed(
  count: number,
  scrollRef: RefObject<HTMLElement | null>,
  mode: ScrollContainerMode,
) {
  const listAnchorRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const listAnchor = listAnchorRef.current;
    if (!listAnchor || count === 0) {
      setScrollMargin(0);
      return;
    }

    const updateScrollMargin = () => {
      setScrollMargin(measureScrollMargin(listAnchor, mode));
    };

    updateScrollMargin();

    const resizeObserver = new ResizeObserver(updateScrollMargin);
    resizeObserver.observe(listAnchor);

    if (mode === "element" && scrollRef.current) {
      resizeObserver.observe(scrollRef.current);
    }

    if (mode === "window") {
      window.addEventListener("scroll", updateScrollMargin, { passive: true });
      window.addEventListener("resize", updateScrollMargin, { passive: true });
    }

    return () => {
      resizeObserver.disconnect();
      if (mode === "window") {
        window.removeEventListener("scroll", updateScrollMargin);
        window.removeEventListener("resize", updateScrollMargin);
      }
    };
  }, [count, mode, scrollRef]);

  // TanStack Virtual intentionally exposes an imperative object that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const elementVirtualizer = useVirtualizer({
    count: mode === "element" ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 5,
    scrollMargin,
  });

  const windowVirtualizer = useWindowVirtualizer({
    count: mode === "window" ? count : 0,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 5,
    scrollMargin,
  });

  const virtualizer = mode === "window" ? windowVirtualizer : elementVirtualizer;
  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start - scrollMargin : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return { listAnchorRef, virtualizer, virtualItems, paddingTop, paddingBottom };
}
