"use client";

import { useEffect } from "react";

function isScrollableOverflow(overflowY: string) {
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}

function findScrollContainer(target: EventTarget | null): HTMLElement | null {
  let element =
    target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null;

  let fallback: HTMLElement | null = null;

  while (element && element !== document.documentElement) {
    const { overflowY } = getComputedStyle(element);
    const canScroll =
      isScrollableOverflow(overflowY) && element.scrollHeight > element.clientHeight + 1;

    if (canScroll) {
      if (element.dataset.voopleScroll !== undefined) {
        return element;
      }
      fallback ??= element;
    }

    element = element.parentElement;
  }

  return fallback;
}

/**
 * Явный wheel-scroll для nested overflow (Firefox desktop, колонка постов на профиле).
 * Лента использует window scroll — этот хук ей не нужен.
 */
export function useDocumentScrollWheelForward(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (event.defaultPrevented) return;

      const scrollContainer = findScrollContainer(event.target);
      if (!scrollContainer) return;

      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (maxScroll <= 0) return;

      const previousScrollTop = scrollContainer.scrollTop;
      const nextScrollTop = Math.max(
        0,
        Math.min(maxScroll, previousScrollTop + event.deltaY),
      );

      if (nextScrollTop === previousScrollTop) return;

      scrollContainer.scrollTop = nextScrollTop;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, [enabled]);
}
