"use client";

import { getEffectPreset } from "@/lib/customization/effects-registry";
import { resolveRingStyle } from "@/lib/customization/rings";
import { resolveCustomization } from "@/lib/customization/resolve";
import {
  frameLayerProps,
  ProfileCardFrameDivider,
  ProfileCardFrameOverlay,
} from "@/components/profile/ProfileCardFrame";
import { CssEffectLayer } from "@/components/profile/effects/CssEffectLayer";
import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { cn } from "@/lib/utils";
import { publicAssetUrl } from "@/lib/object-storage";
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
  const resolvedPreviewUrl = publicAssetUrl(previewUrl);

  if (catalog.kind === "profile_frame") {
    const frameId = catalog.equipValue ?? catalog.assetId ?? null;
    const canonicalFrame = resolveCustomization({ profileFrameId: frameId }).assets.frame;
    const resolvedFrame =
      canonicalFrame?.kind === "image" && resolvedPreviewUrl
        ? { ...canonicalFrame, imageUrl: resolvedPreviewUrl }
        : canonicalFrame;

    if (!resolvedFrame && resolvedPreviewUrl) {
      return (
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- CDN frame preview fallback */}
          <img
            src={resolvedPreviewUrl}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      );
    }

    const frame = frameLayerProps(resolvedFrame);
    return (
      <article
        className={cn("profile-card profile-card--split relative h-full w-full", frame.className, className)}
        style={{
          ...frame.style,
          "--profile-section-gap": "30px",
          "--profile-frame-width": "12px",
          "--profile-frame-outset": "12px",
        } as React.CSSProperties}
        aria-label="Предпросмотр рамки карточки"
      >
        <div className="flex h-full min-h-0 flex-col gap-[var(--profile-section-gap)]">
          <div className="min-h-0 flex-[0.42] rounded-[var(--profile-section-radius)] bg-[linear-gradient(145deg,#514b70,#252238)]" />
          <div className="profile-card__body min-h-0 flex-1 bg-[linear-gradient(145deg,#29263a,#15131e)] p-3">
            <ProfileCardFrameDivider frame={resolvedFrame} />
            <div className="h-2 w-2/3 rounded-full bg-white/25" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-white/15" />
          </div>
        </div>
        <ProfileCardFrameOverlay frame={resolvedFrame} />
      </article>
    );
  }

  if (catalog.kind === "feed_card" && resolvedPreviewUrl) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center p-4", className)}>
        <div className="voople-author-nameplate relative h-14 w-full overflow-hidden rounded-xl" aria-label="Предпросмотр плашки имени">
          <FeedAuthorChipBackdrop backgroundUrl={resolvedPreviewUrl} />
          <span className="absolute left-10 top-1/2 z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-[linear-gradient(145deg,#8b5cf6,#312e81)]" />
          <span className="absolute left-20 top-1/2 z-10 max-w-[calc(100%_-_6rem)] -translate-y-1/2 truncate text-sm font-semibold text-white">Ваше имя</span>
        </div>
      </div>
    );
  }

  if (resolvedPreviewUrl && catalogItemUsesCdn(catalog)) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(145deg,var(--app-surface-soft),color-mix(in_srgb,var(--theme-accent)_12%,var(--app-surface)))]",
          className,
        )}
      >
        <span className="px-3 text-center text-xs text-[var(--app-muted)]">
          Превью временно недоступно
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- CDN customization previews */}
        <img
          src={resolvedPreviewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      </div>
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
