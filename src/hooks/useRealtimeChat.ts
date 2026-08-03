"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
type RealtimeRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string | null;
  media_url: string | null;
  shared_track_id: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  read_at: string | null;
};

type RealtimeStatus = "idle" | "connecting" | "subscribed" | "degraded";
type RealtimeState = {
  key: string | null;
  status: RealtimeStatus;
  lastEventAt: string | null;
};

/** Подписка на INSERT/UPDATE в `messages` для чата. */
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
        () => {
          setRealtimeState({
            key: subscriptionKey,
            status: "subscribed",
            lastEventAt: new Date().toISOString(),
          });
          void utils.chat.getMessages.invalidate({ chatId });
          void utils.chat.list.invalidate();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as RealtimeRow;
          setRealtimeState({
            key: subscriptionKey,
            status: "subscribed",
            lastEventAt: new Date().toISOString(),
          });
          utils.chat.getMessages.setData({ chatId }, (current) => {
            if (!current) return current;
            return {
              ...current,
              messages: current.messages.map((message) =>
                message.id === row.id
                  ? { ...message, text: row.text, readAt: row.read_at }
                  : message,
              ),
            };
          });
          void utils.chat.list.invalidate();
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
        () => {
          setRealtimeState({
            key: subscriptionKey,
            status: "subscribed",
            lastEventAt: new Date().toISOString(),
          });
          void utils.chat.getMessages.invalidate({ chatId });
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
          // An unexpected close must keep the HTTP polling fallback active.
          // Cleanup for a different chat is ignored by the subscription key.
          setRealtimeState((current) =>
            current.key === subscriptionKey || current.key === null
              ? { key: subscriptionKey, status: "degraded", lastEventAt: current.lastEventAt }
              : current,
          );
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

/** Обновление списка диалогов при новых сообщениях. */
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
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
