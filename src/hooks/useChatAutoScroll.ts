"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useChatAutoScroll(conversationKey: string, itemCount: number) {
  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const contentNodeRef = useRef<HTMLDivElement | null>(null);
  const [attachmentVersion, setAttachmentVersion] = useState(0);
  const currentConversationRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const savedScrollTopRef = useRef<number | null>(null);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node && containerNodeRef.current && !stickToBottomRef.current) savedScrollTopRef.current = containerNodeRef.current.scrollTop;
    containerNodeRef.current = node;
    setAttachmentVersion((version) => version + 1);
  }, []);
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    contentNodeRef.current = node;
    setAttachmentVersion((version) => version + 1);
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = containerNodeRef.current;
    if (!container) return;
    stickToBottomRef.current = true;
    savedScrollTopRef.current = null;
    setIsAwayFromBottom(false);
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, []);

  useLayoutEffect(() => {
    const container = containerNodeRef.current;
    const content = contentNodeRef.current;
    if (!container || !content) return;

    const conversationChanged = currentConversationRef.current !== conversationKey;
    if (conversationChanged) {
      currentConversationRef.current = conversationKey;
      stickToBottomRef.current = true;
      savedScrollTopRef.current = null;
      setIsAwayFromBottom(false);
    }

    const align = () => {
      if (!stickToBottomRef.current) return;
      container.scrollTop = container.scrollHeight;
    };
    if (!stickToBottomRef.current && savedScrollTopRef.current !== null) container.scrollTop = savedScrollTopRef.current;
    else align();
    const updateStickiness = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distance < 96;
      savedScrollTopRef.current = stickToBottomRef.current ? null : container.scrollTop;
      setIsAwayFromBottom(!stickToBottomRef.current);
    };

    container.addEventListener("scroll", updateStickiness, { passive: true });
    content.addEventListener("load", align, true);
    const resizeObserver = new ResizeObserver(align);
    resizeObserver.observe(content);

    return () => {
      container.removeEventListener("scroll", updateStickiness);
      content.removeEventListener("load", align, true);
      resizeObserver.disconnect();
    };
  }, [attachmentVersion, conversationKey, itemCount]);

  return { containerRef, contentRef, isAwayFromBottom, scrollToBottom };
}
