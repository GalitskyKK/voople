import type { CSSProperties } from "react";

import { getAppTheme, type AppThemeId } from "@/lib/app-themes";

import type { ShopCatalogItem, ShopItemKind } from "./catalog";

/** Предмет без файла в CDN — только CSS / токены в коде. */
export function catalogItemUsesCdn(item: ShopCatalogItem): boolean {
  return Boolean(item.assetFolder && item.assetId);
}

export function catalogItemUsesCss(item: ShopCatalogItem): boolean {
  return !catalogItemUsesCdn(item);
}

const CSS_KINDS = new Set<ShopItemKind>(["ring", "nickname_style", "app_theme"]);

export function isCssOnlyShopKind(kind: ShopItemKind): boolean {
  return CSS_KINDS.has(kind);
}

/** Превью для карточки магазина, когда `previewUrl` из CDN нет. */
export function getCssCatalogPreviewStyle(item: ShopCatalogItem): CSSProperties | null {
  if (catalogItemUsesCdn(item)) return null;

  switch (item.kind) {
    case "nickname_style": {
      const color = item.equipValue ?? "#e5e5e5";
      return {
        background: `linear-gradient(135deg, ${color}, #ffffff)`,
      };
    }
    case "ring":
      return {
        background: "radial-gradient(circle at 50% 45%, rgba(139,126,200,0.35), #0a0a0f 70%)",
      };
    case "app_theme": {
      const themeId = item.equipValue;
      if (!themeId || !["void", "violet", "rose", "emerald", "gold"].includes(themeId)) {
        return { background: "#0c0c11" };
      }
      const theme = getAppTheme(themeId as AppThemeId);
      return {
        background: `linear-gradient(160deg, ${theme.tokens.background}, ${theme.tokens.accent}55)`,
      };
    }
    default:
      return { background: "linear-gradient(160deg, #1a1a22, #0a0a0f)" };
  }
}
