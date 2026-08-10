"use client";

import { useEffect, useState } from "react";

import type { PublicGroupSearchHit } from "@/types/chat";

export function usePublicGroupSearch({
  enabled,
  query,
  search,
}: {
  enabled: boolean;
  query: string;
  search?: (query: string) => Promise<PublicGroupSearchHit[]>;
}) {
  const [groups, setGroups] = useState<PublicGroupSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!enabled || !search || cleanQuery.length < 2) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void search(cleanQuery)
        .then((result) => {
          if (active) setGroups(result);
        })
        .catch((cause: unknown) => {
          if (!active) return;
          setGroups([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Не удалось найти открытые группы",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [enabled, query, search]);

  const active = enabled && Boolean(search) && query.trim().length >= 2;
  return {
    groups: active ? groups : [],
    loading: active ? loading : false,
    error: active ? error : null,
    setError,
  };
}
