"use client";

import { useEffect, useRef, useState } from "react";

/**
 * true when sentinel has left the viewport (scrolled past).
 * Starts false so sticky header is hidden on first paint.
 */
export function useStickyAfterScroll(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setScrolledPast(!entry.isIntersecting);
    }, { threshold: 0, ...options });

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.root, options?.rootMargin, options?.threshold]);

  return { ref, scrolledPast };
}
