import { useEffect, useRef, useState } from "react";

import {
  canAcknowledgeConversation,
  latestUnreadIncomingAt,
} from "@/lib/chat/read-receipts";
import { reportProductEvent } from "@/lib/telemetry/client";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageView } from "@/types/chat";

import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";

export function useDesktopChatRealtime({
  chatId,
  config,
  messages,
  onInboxChange,
}: {
  chatId: string;
  config: DesktopConfig;
  messages: ChatMessageView[] | undefined;
  onInboxChange: () => void;
}) {
  const utils = trpc.useUtils();
  const [live, setLive] = useState(false);
  const onInboxChangeRef = useRef(onInboxChange);
  const readThroughRef = useRef<string | null>(null);
  const markRead = trpc.chat.markRead.useMutation({
    onSuccess: () => onInboxChangeRef.current(),
  });

  useEffect(() => {
    onInboxChangeRef.current = onInboxChange;
  }, [onInboxChange]);

  useEffect(() => {
    reportProductEvent("chat_opened", { surface: "conversation" });
  }, [chatId]);

  useEffect(() => {
    const supabase = getSupabase(config);
    const channel = supabase
      .channel(`desktop:chat:${chatId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          void utils.chat.observeMessages.invalidate({ chatId });
          void utils.chat.list.invalidate();
          onInboxChangeRef.current();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `chat_id=eq.${chatId}`,
        },
        () => void utils.chat.observeMessages.invalidate({ chatId }),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId, config, utils]);

  const unreadThroughAt = latestUnreadIncomingAt(messages);
  useEffect(() => {
    if (!unreadThroughAt) return;
    let active = true;
    const acknowledge = () => {
      if (
        !active ||
        !canAcknowledgeConversation() ||
        readThroughRef.current === unreadThroughAt
      ) return;
      readThroughRef.current = unreadThroughAt;
      markRead.mutate(
        { chatId, throughAt: unreadThroughAt },
        {
          onError: () => {
            if (active && readThroughRef.current === unreadThroughAt) {
              readThroughRef.current = null;
            }
          },
        },
      );
    };
    acknowledge();
    document.addEventListener("visibilitychange", acknowledge);
    window.addEventListener("focus", acknowledge);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", acknowledge);
      window.removeEventListener("focus", acknowledge);
    };
  }, [chatId, markRead, unreadThroughAt]);

  return live;
}
