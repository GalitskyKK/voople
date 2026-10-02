"use client";

import { useEffect } from "react";

import { trpc } from "@/lib/trpc/client";
import { DEFAULT_APP_THEME_ID } from "@/lib/app-themes";

import { useAppTheme } from "./AppThemeProvider";

/**
 * Client projection, refreshed on focus/reconnect and every 30s; never writes saved preference.
 */
export function AppThemeSync() {
  const { setAccountThemeId } = useAppTheme();
  const query = trpc.customization.accountTheme.useQuery(undefined, {
    retry: false, staleTime: 0, refetchInterval: 30_000,
    refetchOnWindowFocus: "always", refetchOnReconnect: "always",
  });

  useEffect(() => {
    setAccountThemeId(query.isError || !query.isFetchedAfterMount ? DEFAULT_APP_THEME_ID : query.data?.effectiveAppThemeId ?? DEFAULT_APP_THEME_ID);
  }, [query.data, query.isError, query.isFetchedAfterMount, setAccountThemeId]);
  useEffect(() => () => setAccountThemeId(null), [setAccountThemeId]);

  return null;
}
