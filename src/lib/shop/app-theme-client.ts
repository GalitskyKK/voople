import { DEFAULT_APP_THEME_ID, type AppThemeId } from "@/lib/app-themes";
import { isAppThemeId } from "@/lib/shop/catalog";

/** Применить тему shell после equip/clear или синка с `profile_customization.app_theme_id`. */
export function applyEquippedAppTheme(
  setThemeId: (themeId: AppThemeId) => void,
  appThemeId: string | null | undefined,
) {
  if (appThemeId && isAppThemeId(appThemeId)) {
    setThemeId(appThemeId);
    return;
  }
  setThemeId(DEFAULT_APP_THEME_ID);
}
