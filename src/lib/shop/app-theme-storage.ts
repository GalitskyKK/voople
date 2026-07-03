import { DEFAULT_APP_THEME_ID, getAppTheme, type AppThemeId } from "@/lib/app-themes";

export const APP_THEME_STORAGE_KEY = "voople:app-theme";

export function readStoredAppThemeId(): AppThemeId {
  if (typeof window === "undefined") return DEFAULT_APP_THEME_ID;
  return getAppTheme(window.localStorage.getItem(APP_THEME_STORAGE_KEY)).id;
}

export function writeStoredAppThemeId(themeId: AppThemeId) {
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
}

export function subscribeAppThemeStorage(onStoreChange: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === APP_THEME_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
