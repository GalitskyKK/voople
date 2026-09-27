"use client";

import { useEffect, useRef, useState } from "react";

export type GroupWorkspaceMode = "compact" | "medium" | "wide";

/** Resolve the actual Group area rather than assuming a viewport/sidebar size. */
export function useGroupWorkspaceMode(onModeChange?: (next: GroupWorkspaceMode, previous: GroupWorkspaceMode) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const currentMode = useRef<GroupWorkspaceMode>("compact");
  const [mode, setMode] = useState<GroupWorkspaceMode>("compact");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const width = element.getBoundingClientRect().width;
      const next = width >= 1120 ? "wide" : width >= 800 ? "medium" : "compact";
      if (currentMode.current === next) return;
      const previous = currentMode.current;
      currentMode.current = next;
      onModeChange?.(next, previous);
      setMode(next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [onModeChange]);

  return { ref, mode };
}
