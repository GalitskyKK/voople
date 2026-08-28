"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  canAcknowledgeConversation,
  latestUnreadIncomingAt,
} from "@/lib/chat/read-receipts";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageView } from "@/types/chat";

export function useChatReadReceipt(
  chatId: string,
  messages: readonly ChatMessageView[] | undefined,
) {
  const utils = trpc.useUtils();
  const inFlightThroughRef = useRef<string | null>(null);
  const acknowledgedThroughRef = useRef<string | null>(null);
  const throughAt = latestUnreadIncomingAt(messages);
  const { mutate: markRead } = trpc.chat.markRead.useMutation();

  useEffect(() => {
    inFlightThroughRef.current = null;
    acknowledgedThroughRef.current = null;
  }, [chatId]);

  const acknowledge = useCallback(() => {
    if (!throughAt || !canAcknowledgeConversation()) return;
    if (
      throughAt === inFlightThroughRef.current ||
      throughAt === acknowledgedThroughRef.current
    ) {
      return;
    }

    inFlightThroughRef.current = throughAt;
    markRead(
      { chatId, throughAt },
      {
        onSuccess: () => {
          acknowledgedThroughRef.current = throughAt;
          void utils.chat.list.invalidate();
        },
        onSettled: () => {
          if (inFlightThroughRef.current === throughAt) {
            inFlightThroughRef.current = null;
          }
        },
      },
    );
  }, [chatId, markRead, throughAt, utils.chat.list]);

  useEffect(() => {
    acknowledge();
    const onVisibilityChange = () => acknowledge();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", acknowledge);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", acknowledge);
    };
  }, [acknowledge]);
}
