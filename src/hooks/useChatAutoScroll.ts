"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useChatAutoScroll(conversationKey: string, itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentConversationRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    stickToBottomRef.current = true;
    setIsAwayFromBottom(false);
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const conversationChanged = currentConversationRef.current !== conversationKey;
    if (conversationChanged) {
      currentConversationRef.current = conversationKey;
      stickToBottomRef.current = true;
      setIsAwayFromBottom(false);
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
      setIsAwayFromBottom(!stickToBottomRef.current);
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

  return { containerRef, contentRef, isAwayFromBottom, scrollToBottom };
}
