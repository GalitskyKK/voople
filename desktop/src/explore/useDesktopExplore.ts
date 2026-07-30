import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ExploreSearchResult,
  HashtagSearchHit,
} from "@/types/search";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

const EMPTY_RESULT: ExploreSearchResult = {
  users: [],
  hashtags: [],
  posts: [],
};

function parseExploreResult(value: unknown): ExploreSearchResult {
  if (!value || typeof value !== "object") {
    throw new Error("Сервер вернул некорректный результат поиска");
  }
  const result = value as Partial<ExploreSearchResult>;
  if (
    !Array.isArray(result.users) ||
    !Array.isArray(result.hashtags) ||
    !Array.isArray(result.posts)
  ) {
    throw new Error("Сервер вернул некорректный результат поиска");
  }
  return result as ExploreSearchResult;
}

function parseTrending(value: unknown): HashtagSearchHit[] {
  if (!Array.isArray(value)) {
    throw new Error("Сервер вернул некорректный список трендов");
  }
  return value as HashtagSearchHit[];
}

export function useDesktopExplore(
  config: DesktopConfig,
  session: Session,
  query: string,
) {
  const [result, setResult] = useState<ExploreSearchResult>();
  const [trending, setTrending] = useState<HashtagSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const requestId = useRef(0);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  useEffect(() => {
    const currentRequest = ++requestId.current;
    void Promise.resolve().then(async () => {
      if (currentRequest !== requestId.current) return;

      if (query.length === 0) {
        setResult(undefined);
        setSearchError(null);
        setSearching(false);
        setTrendingLoading(true);
        setTrendingError(null);
        try {
          const value = await client.query("search.trendingHashtags", {
            limit: 10,
          });
          if (currentRequest === requestId.current) {
            setTrending(parseTrending(value));
          }
        } catch (error: unknown) {
          if (currentRequest === requestId.current) {
            setTrendingError(
              error instanceof Error
                ? error.message
                : "Не удалось загрузить тренды",
            );
          }
        } finally {
          if (currentRequest === requestId.current) setTrendingLoading(false);
        }
        return;
      }

      setSearching(true);
      setSearchError(null);
      setResult(undefined);
      try {
        const value = await client.query("search.explore", { q: query });
        if (currentRequest === requestId.current) {
          setResult(parseExploreResult(value));
        }
      } catch (error: unknown) {
        if (currentRequest === requestId.current) {
          setResult(EMPTY_RESULT);
          setSearchError(
            error instanceof Error ? error.message : "Ошибка поиска",
          );
        }
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    });

    return () => {
      requestId.current += 1;
    };
  }, [client, query]);

  return {
    result,
    searchError,
    searching,
    trending,
    trendingError,
    trendingLoading,
  };
}
