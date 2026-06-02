"use client";

import { cn } from "@/lib/utils";
import {
  catalogItemUsesCdn,
  getCssCatalogPreviewStyle,
} from "@/lib/shop/catalog-delivery";
import type { ShopCatalogItem } from "@/lib/shop/catalog";

type ShopCatalogPreviewProps = {
  catalog: ShopCatalogItem;
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

  const cssPreview = getCssCatalogPreviewStyle(catalog);
  if (!cssPreview) {
    return (
      <div className={cn("flex h-full items-center justify-center text-sm text-white/30", className)}>
        Нет превью
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)} style={cssPreview}>
      {catalog.kind === "ring" && (
        <div
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--theme-accent)] ring-offset-2 ring-offset-[#0a0a0f]"
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
        <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80">
          {catalog.name}
        </span>
      )}
    </div>
  );
}
