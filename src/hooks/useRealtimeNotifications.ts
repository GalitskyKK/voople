"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";

export function useRealtimeNotifications(enabled = true) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let cancelled = false;
    let removeChannel: (() => void) | null = null;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session?.user) return;
      const userId = session.user.id;

      const channelId = crypto.randomUUID();
      const channel = supabase
        .channel(`notifications:${userId}:${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void utils.notifications.list.invalidate();
            void utils.notifications.unreadCount.invalidate();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void utils.notifications.list.invalidate();
            void utils.notifications.unreadCount.invalidate();
          },
        )
        .subscribe();

      removeChannel = () => {
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      removeChannel?.();
    };
  }, [enabled, utils]);
}
