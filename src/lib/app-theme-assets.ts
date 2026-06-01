import { customizationAssetPath } from "@/lib/customization/asset-path";

import type { AppTheme } from "./app-themes";

export type AppThemeAssetIds = {
  /** Static or animated shell background (WebP/APNG). */
  backgroundId?: string;
  /** Static fallback when `backgroundId` is animated and motion is reduced. */
  backgroundStaticId?: string;
  /** Optional decorative overlay above background, below scrim. */
  overlayId?: string;
};

export type ResolvedAppThemeAssets = {
  backgroundUrl: string | null;
  overlayUrl: string | null;
};

export function resolveAppThemeAssets(
  theme: AppTheme,
  options?: { preferStaticBackground?: boolean },
): ResolvedAppThemeAssets {
  const backgroundId =
    options?.preferStaticBackground && theme.assets?.backgroundStaticId
      ? theme.assets.backgroundStaticId
      : theme.assets?.backgroundId;

  return {
    backgroundUrl: customizationAssetPath("themes", backgroundId),
    overlayUrl: customizationAssetPath("themes", theme.assets?.overlayId),
  };
}
