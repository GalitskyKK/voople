import { DEFAULT_APP_THEME_ID, isAppThemeId, type AppThemeId } from "@/lib/app-themes";

/** Apply only the API's effective theme, never its saved preference. */
export function applyEquippedAppTheme(
  setThemeId: (themeId: AppThemeId) => void,
  appThemeId: string | null | undefined,
) {
  setThemeId(appThemeId && isAppThemeId(appThemeId) ? appThemeId : DEFAULT_APP_THEME_ID);
}

/** Сброс shop-темы после clear слота `app_theme_id`. */
export function clearEquippedAppTheme(setThemeId: (themeId: AppThemeId) => void) {
  setThemeId(DEFAULT_APP_THEME_ID);
}
