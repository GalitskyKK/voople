"use client";

import { useEffect } from "react";

import { trpc } from "@/lib/trpc/client";
import { applyEquippedAppTheme } from "@/lib/shop/app-theme-client";

import { useAppTheme } from "./AppThemeProvider";

/**
 * Для авторизованных пользователей тема shell берётся из БД (`app_theme_id`),
 * а не только из localStorage.
 */
export function AppThemeSync() {
  const { setThemeId } = useAppTheme();
  const equippedQuery = trpc.customization.getEquipped.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!equippedQuery.data) return;
    applyEquippedAppTheme(setThemeId, equippedQuery.data.appThemeId);
  }, [equippedQuery.data?.appThemeId, setThemeId]);

  return null;
}
