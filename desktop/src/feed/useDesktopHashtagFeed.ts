import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { parseDesktopFeedPage, type DesktopPost } from "./types";

export function useDesktopHashtagFeed(
  config: DesktopConfig,
  session: Session,
  tag: string,
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
    setError(null);
    if (cursor) setLoadingMore(true);
    else {
      setLoading(true);
      setItems([]);
      setNextCursor(undefined);
    }
    try {
      const result = parseDesktopFeedPage(
        await client.query("feed.getHashtagPage", { tag, cursor, limit: 15 }),
      );
      if (currentRequest !== requestId.current) return;
      setItems((current) => cursor ? [...current, ...result.items] : result.items);
      setNextCursor(result.nextCursor);
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить хэштег");
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [client, tag]);

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
