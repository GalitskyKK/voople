"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ESTIMATED_POST_HEIGHT = 160;

export function useVirtualFeed(
  count: number,
  scrollRef: RefObject<HTMLElement | null>,
) {
  const listAnchorRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    const listAnchor = listAnchorRef.current;
    if (!scrollElement || !listAnchor || count === 0) {
      setScrollMargin(0);
      return;
    }

    const updateScrollMargin = () => {
      setScrollMargin(listAnchor.offsetTop);
    };

    updateScrollMargin();

    const observer = new ResizeObserver(updateScrollMargin);
    observer.observe(scrollElement);
    observer.observe(listAnchor);

    return () => observer.disconnect();
  }, [count, scrollRef]);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 5,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start - scrollMargin : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return { listAnchorRef, virtualizer, virtualItems, paddingTop, paddingBottom };
}
