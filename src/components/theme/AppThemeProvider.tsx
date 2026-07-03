"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  DEFAULT_APP_THEME_ID,
  getAppTheme,
  type AppTheme,
  type AppThemeId,
} from "@/lib/app-themes";
import {
  readStoredAppThemeId,
  subscribeAppThemeStorage,
  writeStoredAppThemeId,
} from "@/lib/shop/app-theme-storage";

import { AppThemeBackground } from "./AppThemeBackground";

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
  const storedThemeId = useSyncExternalStore(
    subscribeAppThemeStorage,
    readStoredAppThemeId,
    () => DEFAULT_APP_THEME_ID,
  );
  const [override, setOverride] = useState<AppThemeId | null>(null);

  const themeId: AppThemeId = override ?? storedThemeId;
  const theme = useMemo(() => getAppTheme(themeId), [themeId]);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const setThemeId = useCallback((nextThemeId: AppThemeId) => {
    writeStoredAppThemeId(nextThemeId);
    setOverride(nextThemeId);
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({ themeId, theme, setThemeId }),
    [theme, themeId, setThemeId],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <AppThemeBackground />
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
