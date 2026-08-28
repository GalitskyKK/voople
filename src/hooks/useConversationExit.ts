"use client";

import { useEffect, useRef } from "react";

type ConversationExitOptions = {
  active: boolean;
  onExit: () => void;
};

function hasBlockingDialog() {
  return Boolean(
    document.querySelector('[role="dialog"][aria-modal="true"]'),
  );
}

/**
 * Closes an active conversation without competing with its topmost modal.
 * The microtask lets a later-mounted overlay consume the same Escape event.
 */
export function useConversationExit({ active, onExit }: ConversationExitOptions) {
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!active) return;
    let mounted = true;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;

      queueMicrotask(() => {
        if (!mounted || event.defaultPrevented || hasBlockingDialog()) return;
        event.preventDefault();
        onExitRef.current();
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      mounted = false;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);
}
