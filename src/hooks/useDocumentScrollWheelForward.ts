"use client";

import { useEffect } from "react";

function findScrollContainer(target: EventTarget | null): HTMLElement | null {
  let element =
    target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null;

  while (element) {
    if (!element.classList.contains("voople-scroll")) {
      element = element.parentElement;
      continue;
    }

    const { overflowY } = getComputedStyle(element);
    const scrollable =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    if (scrollable && element.scrollHeight > element.clientHeight) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
}

/**
 * Firefox не прокручивает nested overflow колёсиком над дочерними узлами.
 * Ищем ближайший .voople-scroll от event.target и скроллим его явно.
 */
export function useDocumentScrollWheelForward(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;

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
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, [enabled]);
}
