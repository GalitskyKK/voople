"use client";

import { useEffect, useRef } from "react";

export function useChatAutoScroll(conversationKey: string, itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentConversationRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const conversationChanged = currentConversationRef.current !== conversationKey;
    if (conversationChanged) {
      currentConversationRef.current = conversationKey;
      stickToBottomRef.current = true;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;
    const scrollToBottom = () => {
      if (!stickToBottomRef.current) return;
      container.scrollTop = container.scrollHeight;
    };
    const scheduleScroll = () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      firstFrame = requestAnimationFrame(() => {
        scrollToBottom();
        secondFrame = requestAnimationFrame(scrollToBottom);
      });
      settleTimer = window.setTimeout(scrollToBottom, 160);
    };
    const updateStickiness = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distance < 96;
    };

    container.addEventListener("scroll", updateStickiness, { passive: true });
    content.addEventListener("load", scheduleScroll, true);
    const resizeObserver = new ResizeObserver(scheduleScroll);
    resizeObserver.observe(content);
    scheduleScroll();

    return () => {
      container.removeEventListener("scroll", updateStickiness);
      content.removeEventListener("load", scheduleScroll, true);
      resizeObserver.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
    };
  }, [conversationKey, itemCount]);

  return { containerRef, contentRef };
}
