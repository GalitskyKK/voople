"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_APP_THEME_ID,
  getAppTheme,
  type AppTheme,
  type AppThemeId,
} from "@/lib/app-themes";

import { AppThemeBackground } from "./AppThemeBackground";

const STORAGE_KEY = "voople:app-theme";

type AppThemeContextValue = {
  themeId: AppThemeId;
  theme: AppTheme;
  setThemeId: (themeId: AppThemeId) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function applyTheme(themeId: AppThemeId) {
  const theme = getAppTheme(themeId);
  const root = document.documentElement;

  root.dataset.appTheme = theme.id;
  root.style.setProperty("--background", theme.tokens.background);
  root.style.setProperty("--foreground", theme.tokens.foreground);
  root.style.setProperty("--app-surface", theme.tokens.surface);
  root.style.setProperty("--app-surface-soft", theme.tokens.surfaceSoft);
  root.style.setProperty("--app-border", theme.tokens.border);
  root.style.setProperty("--theme-accent", theme.tokens.accent);
  root.style.setProperty("--app-accent-soft", theme.tokens.accentSoft);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(DEFAULT_APP_THEME_ID);
  const [themeReady, setThemeReady] = useState(false);

  const theme = useMemo(() => getAppTheme(themeId), [themeId]);

  useEffect(() => {
    setThemeIdState(getAppTheme(window.localStorage.getItem(STORAGE_KEY)).id);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      themeId,
      theme,
      setThemeId: (nextThemeId) => {
        const nextTheme = getAppTheme(nextThemeId);
        window.localStorage.setItem(STORAGE_KEY, nextTheme.id);
        setThemeIdState(nextTheme.id);
      },
    }),
    [theme, themeId],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {themeReady ? <AppThemeBackground /> : null}
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }
  return context;
}
