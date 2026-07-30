import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { parseDesktopFeedPage, type DesktopFeedTab, type DesktopPost } from "./types";

export function useDesktopFeed(
  config: DesktopConfig,
  session: Session,
  tab: DesktopFeedTab,
) {
  const [items, setItems] = useState<DesktopPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const load = useCallback(async (cursor?: string) => {
    const currentRequest = ++requestId.current;
    await Promise.resolve();
    if (currentRequest !== requestId.current) return;
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setItems([]);
      setNextCursor(undefined);
    }
    setError(null);
    try {
      const result = parseDesktopFeedPage(
        await client.query("feed.getPage", { cursor, limit: 15, tab }),
      );
      if (currentRequest !== requestId.current) return;
      setItems((current) => cursor ? [...current, ...result.items] : result.items);
      setNextCursor(result.nextCursor);
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить ленту");
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [client, tab]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return {
    error,
    items,
    loading,
    loadingMore,
    loadMore: nextCursor ? () => load(nextCursor) : null,
    retry: () => load(),
  };
}
