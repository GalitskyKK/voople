import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

type DesktopChatsContextValue = {
  chats: ChatListItem[];
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
};

const DesktopChatsContext = createContext<DesktopChatsContextValue | null>(null);

export function DesktopChatsProvider({
  config,
  session,
  children,
}: {
  config: DesktopConfig;
  session: Session;
  children: ReactNode;
}) {
  const value = useDesktopChatsController(config, session);
  return createElement(DesktopChatsContext.Provider, { value }, children);
}

export function useDesktopChats() {
  const value = useContext(DesktopChatsContext);
  if (!value) {
    throw new Error("useDesktopChats must be used inside DesktopChatsProvider");
  }
  return value;
}

function useDesktopChatsController(
  config: DesktopConfig,
  session: Session,
): DesktopChatsContextValue {
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

  const refresh = useCallback(() => load({ silent: true }), [load]);
  const retry = useCallback(() => load(), [load]);

  return {
    chats,
    error,
    loading,
    refresh,
    retry,
  };
}
