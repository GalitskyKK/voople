"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import type { ChatListItem, ChatMessageView } from "@/server/services/chat.service";

type RealtimeRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string | null;
  created_at: string;
};

function rowToMessage(row: RealtimeRow, viewerId: string): ChatMessageView {
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text,
    createdAt: row.created_at,
    isMine: row.sender_id === viewerId,
  };
}

type MessagesCache = {
  messages: ChatMessageView[];
  otherUser: ChatListItem["otherUser"];
};

type RealtimeStatus = "idle" | "connecting" | "subscribed" | "degraded";
type RealtimeState = {
  key: string | null;
  status: RealtimeStatus;
  lastEventAt: string | null;
};

function mergeMessage(current: MessagesCache | undefined, incoming: ChatMessageView) {
  if (!current) return { messages: [incoming], otherUser: null };
  if (current.messages.some((m) => m.id === incoming.id)) return current;
  return {
    ...current,
    messages: [...current.messages, incoming].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ),
  };
}

/** Подписка на INSERT в `messages` для чата (нужны RLS + `03-realtime-messages.sql`). */
export function useRealtimeChat(chatId: string, viewerId: string | null | undefined) {
  const utils = trpc.useUtils();
  const subscriptionKey = chatId && viewerId ? `${chatId}:${viewerId}` : null;
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    key: null,
    status: "idle",
    lastEventAt: null,
  });

  useEffect(() => {
    if (!chatId || !viewerId || !subscriptionKey) return;

    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const subscribeTimeout = window.setTimeout(() => {
      setRealtimeState((current) =>
        current.key === subscriptionKey && current.status !== "connecting"
          ? current
          : { key: subscriptionKey, status: "degraded", lastEventAt: null },
      );
    }, 8_000);

    const channel = supabase
      .channel(`messages:${chatId}:${channelId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as RealtimeRow;
          const incoming = rowToMessage(row, viewerId);

          setRealtimeState({
            key: subscriptionKey,
            status: "subscribed",
            lastEventAt: new Date().toISOString(),
          });
          utils.chat.getMessages.setData({ chatId }, (current) =>
            mergeMessage(current, incoming),
          );

          void utils.chat.list.invalidate();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(subscribeTimeout);
          setRealtimeState((current) => ({
            key: subscriptionKey,
            status: "subscribed",
            lastEventAt: current.key === subscriptionKey ? current.lastEventAt : null,
          }));
          void utils.chat.getMessages.invalidate({ chatId });
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          window.clearTimeout(subscribeTimeout);
          setRealtimeState({ key: subscriptionKey, status: "degraded", lastEventAt: null });
        }
        if (status === "CLOSED") {
          window.clearTimeout(subscribeTimeout);
          setRealtimeState({ key: subscriptionKey, status: "idle", lastEventAt: null });
        }
      });

    return () => {
      window.clearTimeout(subscribeTimeout);
      void supabase.removeChannel(channel);
    };
  }, [chatId, subscriptionKey, viewerId, utils]);

  const realtimeStatus =
    !subscriptionKey
      ? "idle"
      : realtimeState.key === subscriptionKey
        ? realtimeState.status
        : "connecting";
  const lastEventAt = realtimeState.key === subscriptionKey ? realtimeState.lastEventAt : null;

  return {
    realtimeStatus,
    realtimeConnected: realtimeStatus === "subscribed",
    realtimeDegraded: realtimeStatus === "degraded",
    lastEventAt,
  };
}

/** Обновление списка диалогов при новых сообщениях (RLS отдаёт только свои чаты). */
export function useRealtimeInbox(viewerId: string | null | undefined) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!viewerId) return;

    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const channel = supabase
      .channel(`inbox:${viewerId}:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          void utils.chat.list.invalidate();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewerId, utils]);
}
