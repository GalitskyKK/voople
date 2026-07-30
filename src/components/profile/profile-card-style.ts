import type { CSSProperties } from "react";

import { readableForeground } from "@/lib/customization/readable-foreground";
import type { ProfileCustomizationView } from "@/types/domain";

export function profileCardThemeStyle(
  customization: ProfileCustomizationView,
): CSSProperties {
  if (customization.flags.hasBannerMedia) {
    return {
      "--theme-accent": customization.themeAccent,
      background: "transparent",
    } as CSSProperties;
  }

  if (!customization.flags.hasProfileTheme) {
    return {
      "--theme-accent": customization.themeAccent,
      background: "var(--app-surface)",
    } as CSSProperties;
  }

  const { themePrimary, themeAccent } = customization;
  return {
    "--theme-primary": themePrimary,
    "--theme-accent": themeAccent,
    "--foreground": readableForeground(themePrimary, themeAccent),
    background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeAccent} 100%)`,
  } as CSSProperties;
}
