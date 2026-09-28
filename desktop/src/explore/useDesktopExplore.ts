import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BetaSearchResult } from "@/types/search";
import type { PublicGroupSearchHit } from "@/types/chat";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

const EMPTY_RESULT: BetaSearchResult = { people: [] };

function parseExploreResult(value: unknown): BetaSearchResult {
  if (!value || typeof value !== "object") {
    throw new Error("Сервер вернул некорректный результат поиска");
  }
  const result = value as Partial<BetaSearchResult>;
  if (!Array.isArray(result.people)) {
    throw new Error("Сервер вернул некорректный результат поиска");
  }
  return result as BetaSearchResult;
}

function parseCommunities(value: unknown): PublicGroupSearchHit[] {
  if (!Array.isArray(value)) throw new Error("Сервер вернул некорректный список сообществ");
  return value as PublicGroupSearchHit[];
}


export function useDesktopExplore(
  config: DesktopConfig,
  session: Session,
  query: string,
) {
  const [result, setResult] = useState<BetaSearchResult>();
  const [communities, setCommunities] = useState<PublicGroupSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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
        setCommunities([]);
        setSearchError(null);
        setSearching(false);
        return;
      }

      setSearching(true);
      setSearchError(null);
      setResult(undefined);
      try {
        const [value, communityValue] = await Promise.all([
          client.query("search.beta", { q: query }),
          query.length >= 2 ? client.query("chat.publicGroups", { q: query }) : Promise.resolve([]),
        ]);
        if (currentRequest === requestId.current) {
          setResult(parseExploreResult(value));
          setCommunities(parseCommunities(communityValue));
        }
      } catch (error: unknown) {
        if (currentRequest === requestId.current) {
          setResult(EMPTY_RESULT);
          setCommunities([]);
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
    communities,
    searchError,
    searching,
  };
}
