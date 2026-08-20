"use client";

import { useEffect, useRef, useState } from "react";

export function useIntersectionObserver(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const root = options?.root ?? null;
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry?.isIntersecting ?? false);
    }, { root, rootMargin, threshold });

    observer.observe(el);
    return () => observer.disconnect();
  }, [root, rootMargin, threshold]);

  return { ref, isIntersecting };
}
