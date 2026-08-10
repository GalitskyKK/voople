import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatListItem } from "@/types/chat";
import { createDesktopTrpcClient } from "../api/trpc";
import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";

function parseChatList(value: unknown): ChatListItem[] {
  if (!Array.isArray(value)) {
    throw new Error("Сервер вернул некорректный список чатов");
  }
  return value as ChatListItem[];
}

export function useDesktopChats(
  config: DesktopConfig,
  session: Session,
) {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const currentRequest = ++requestId.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const nextChats = parseChatList(await client.query("chat.list"));
        if (currentRequest === requestId.current) setChats(nextChats);
      } catch (loadError) {
        if (currentRequest === requestId.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить чаты",
          );
        }
      } finally {
        if (currentRequest === requestId.current && !silent) setLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const supabase = getSupabase(config);
    const updates = supabase
      .channel(`desktop:inbox:${session.user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void load({ silent: true }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_members" },
        () => void load({ silent: true }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => void load({ silent: true }),
      )
      .subscribe();
    const pollId = window.setInterval(() => {
      void load({ silent: true });
    }, 30_000);

    return () => {
      requestId.current += 1;
      window.clearInterval(pollId);
      void supabase.removeChannel(updates);
    };
  }, [config, load, session.user.id]);

  return {
    chats,
    error,
    loading,
    refresh: () => load({ silent: true }),
    retry: () => load(),
  };
}
