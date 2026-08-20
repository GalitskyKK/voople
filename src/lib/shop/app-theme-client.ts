import { DEFAULT_APP_THEME_ID, isAppThemeId, type AppThemeId } from "@/lib/app-themes";

/** Применить shop-тему shell после equip (только если в БД есть `app_theme_id`). */
export function applyEquippedAppTheme(
  setThemeId: (themeId: AppThemeId) => void,
  appThemeId: string | null | undefined,
) {
  if (appThemeId && isAppThemeId(appThemeId)) {
    setThemeId(appThemeId);
  }
}

/** Сброс shop-темы после clear слота `app_theme_id`. */
export function clearEquippedAppTheme(setThemeId: (themeId: AppThemeId) => void) {
  setThemeId(DEFAULT_APP_THEME_ID);
}
