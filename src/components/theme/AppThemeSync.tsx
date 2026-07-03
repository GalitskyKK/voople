"use client";

import { useEffect, useRef } from "react";

import { trpc } from "@/lib/trpc/client";
import { applyEquippedAppTheme } from "@/lib/shop/app-theme-client";

import { useAppTheme } from "./AppThemeProvider";

/**
 * Для авторизованных: `app_theme_id` из БД — источник правды после reload.
 */
export function AppThemeSync() {
  const { setThemeId } = useAppTheme();
  const syncedRef = useRef<string | null>(null);
  const equippedQuery = trpc.customization.getEquipped.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!equippedQuery.isSuccess || !equippedQuery.data) return;
    const dbTheme = equippedQuery.data.appThemeId;
    const syncKey = dbTheme ?? "__none__";
    if (syncedRef.current === syncKey) return;
    syncedRef.current = syncKey;
    applyEquippedAppTheme(setThemeId, dbTheme);
  }, [equippedQuery.isSuccess, equippedQuery.data?.appThemeId, setThemeId]);

  return null;
}
