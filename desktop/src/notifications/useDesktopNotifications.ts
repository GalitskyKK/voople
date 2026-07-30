import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { NotificationView } from "@/types/notifications";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

function parseNotifications(value: unknown): NotificationView[] {
  if (!Array.isArray(value)) {
    throw new Error("Сервер вернул некорректный список уведомлений");
  }
  return value as NotificationView[];
}

export function useDesktopNotifications(
  config: DesktopConfig,
  session: Session,
) {
  const [items, setItems] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const requestId = useRef(0);

  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const load = useCallback(async ({ silent = false } = {}) => {
    const currentRequest = ++requestId.current;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = parseNotifications(
        await client.query("notifications.list"),
      );
      if (currentRequest === requestId.current) setItems(result);
    } catch (loadError) {
      if (currentRequest === requestId.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить уведомления",
        );
      }
    } finally {
      if (currentRequest === requestId.current && !silent) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const intervalId = window.setInterval(() => {
      void load({ silent: true });
    }, 30_000);

    return () => {
      requestId.current += 1;
      window.clearInterval(intervalId);
    };
  }, [load]);

  const markAllRead = useCallback(async () => {
    const previousItems = items;
    setMarkingRead(true);
    setItems((current) => current.map((item) => ({ ...item, read: true })));

    try {
      await client.mutation("notifications.markAllRead");
    } catch (markError) {
      setItems(previousItems);
      setError(
        markError instanceof Error
          ? markError.message
          : "Не удалось отметить уведомления",
      );
    } finally {
      setMarkingRead(false);
    }
  }, [client, items]);

  return {
    error,
    items,
    loading,
    markAllRead,
    markingRead,
    retry: () => load(),
    unreadCount: items.filter((item) => !item.read).length,
  };
}
