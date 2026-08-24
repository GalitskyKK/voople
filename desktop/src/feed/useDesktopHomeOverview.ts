import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { HomeOverviewView } from "@/types/home";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

const EMPTY_OVERVIEW: HomeOverviewView = {
  viewer: null,
  now: [],
  continue: [],
  continueCandidates: [],
  communities: [],
};

function parseHomeOverview(value: unknown): HomeOverviewView {
  if (!value || typeof value !== "object") throw new Error("Некорректный ответ главной");
  const overview = value as Partial<HomeOverviewView>;
  if (!Array.isArray(overview.now) || !Array.isArray(overview.continue) || !Array.isArray(overview.communities)) {
    throw new Error("Некорректный ответ главной");
  }
  return {
    viewer: overview.viewer ?? null,
    now: overview.now,
    continue: overview.continue,
    continueCandidates: Array.isArray(overview.continueCandidates) ? overview.continueCandidates : overview.continue,
    communities: overview.communities,
  };
}

export function useDesktopHomeOverview(config: DesktopConfig, session: Session) {
  const [overview, setOverview] = useState<HomeOverviewView>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(() => createDesktopTrpcClient(config, () => session.access_token), [config, session.access_token]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(parseHomeOverview(await client.query("home.overview")));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить актуальную активность");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  return { overview, loading, error, retry: load };
}
