"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ESTIMATED_POST_HEIGHT = 160;

export function useVirtualFeed(count: number) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_POST_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return { parentRef, virtualizer, virtualItems, paddingTop, paddingBottom };
}
