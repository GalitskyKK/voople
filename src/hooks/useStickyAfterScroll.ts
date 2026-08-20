"use client";

import { useEffect, useRef, useState } from "react";

/**
 * true when sentinel has left the viewport (scrolled past).
 * Starts false so sticky header is hidden on first paint.
 */
export function useStickyAfterScroll(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  const root = options?.root ?? null;
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setScrolledPast(!entry.isIntersecting);
    }, { root, rootMargin, threshold });

    observer.observe(el);
    return () => observer.disconnect();
  }, [root, rootMargin, threshold]);

  return { ref, scrolledPast };
}
