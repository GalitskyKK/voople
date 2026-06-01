"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * true when the observed element's bottom edge has scrolled above `edgeTop` (px from viewport top).
 * Reliable for profile card → sticky header (unlike sentinel below the fold on first paint).
 */
export function useElementScrolledPast(
  ref: RefObject<HTMLElement | null>,
  { edgeTop = 48 }: { edgeTop?: number } = {},
) {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setScrolledPast(rect.bottom < edgeTop);
    };

    update();
    const observer = new IntersectionObserver(update, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    observer.observe(el);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref, edgeTop]);

  return scrolledPast;
}
