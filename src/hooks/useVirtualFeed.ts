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

  return { parentRef, virtualizer };
}
