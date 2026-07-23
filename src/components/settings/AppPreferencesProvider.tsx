"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_APP_PREFERENCES,
  readAppPreferences,
  subscribeAppPreferences,
  writeAppPreferences,
  type AppPreferences,
} from "@/lib/app-preferences";

type AppPreferencesContextValue = {
  preferences: AppPreferences;
  updatePreferences: (patch: Partial<AppPreferences>) => void;
  resetPreferences: () => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

function applyPreferences(preferences: AppPreferences) {
  const root = document.documentElement;
  root.dataset.fontScale = preferences.fontScale;
  root.dataset.density = preferences.density;
  root.dataset.reduceMotion = String(preferences.reduceMotion);
  root.dataset.showPresence = String(preferences.showPresence);
  root.dataset.chatWallpaper = preferences.chatWallpaper;
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => DEFAULT_APP_PREFERENCES,
  );

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      updatePreferences: (patch) => writeAppPreferences({ ...preferences, ...patch }),
      resetPreferences: () => writeAppPreferences(DEFAULT_APP_PREFERENCES),
    }),
    [preferences],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  return value;
}
