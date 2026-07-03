"use client";

import { getEffectPreset } from "@/lib/customization/effects-registry";
import { resolveRingStyle } from "@/lib/customization/rings";
import { CssEffectLayer } from "@/components/profile/effects/CssEffectLayer";
import { cn } from "@/lib/utils";
import {
  catalogItemUsesCdn,
  getCssCatalogPreviewStyle,
} from "@/lib/shop/catalog-delivery";
import type { ShopPreviewFields } from "@/lib/shop/catalog-delivery";

type ShopCatalogPreviewProps = {
  catalog: ShopPreviewFields;
  previewUrl: string | null;
  className?: string;
};

export function ShopCatalogPreview({ catalog, previewUrl, className }: ShopCatalogPreviewProps) {
  if (previewUrl && catalogItemUsesCdn(catalog)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CDN customization previews
      <img src={previewUrl} alt="" className={cn("h-full w-full object-cover", className)} loading="lazy" />
    );
  }

  // CSS-эффект: показываем реальные частицы вместо статичной заглушки.
  const effectPreset =
    catalog.kind === "effect" ? getEffectPreset(catalog.equipValue) : null;
  if (effectPreset) {
    return (
      <div
        className={cn("relative h-full w-full overflow-hidden bg-[#0a0a0f]", className)}
        aria-hidden
      >
        <CssEffectLayer preset={effectPreset.id} />
      </div>
    );
  }

  const cssPreview = getCssCatalogPreviewStyle(catalog);
  if (!cssPreview) {
    return (
      <div className={cn("flex h-full items-center justify-center text-sm text-[color-mix(in_srgb,var(--foreground)_30%,transparent)]", className)}>
        Нет превью
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)} style={cssPreview}>
      {catalog.kind === "ring" && (
        <div
          className={cn(
            "absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full",
            resolveRingStyle(catalog.equipValue)?.className,
          )}
          aria-hidden
        />
      )}
      {catalog.kind === "nickname_style" && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-clip-text text-2xl font-bold text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${catalog.equipValue ?? "#f9a8d4"}, #fff)`,
          }}
          aria-hidden
        >
          Aa
        </span>
      )}
      {catalog.kind === "app_theme" && (
        <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]">
          {"name" in catalog && catalog.name ? catalog.name : "Тема"}
        </span>
      )}
    </div>
  );
}
