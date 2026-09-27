"use client";

import { useEffect, useRef, useState } from "react";

export type GroupWorkspaceMode = "compact" | "medium" | "wide";

/** Resolve the actual Group area rather than assuming a viewport/sidebar size. */
export function useGroupWorkspaceMode() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GroupWorkspaceMode>("compact");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const width = element.getBoundingClientRect().width;
      setMode(width >= 1120 ? "wide" : width >= 800 ? "medium" : "compact");
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);

  return { ref, mode };
}
