"use client";

import { Check, Lock } from "lucide-react";

import { shopKindLabel } from "@/lib/shop/categories";
import { cn } from "@/lib/utils";
import type { ShopItemView } from "@/types/shop";
import { Button } from "@/components/ui/Button";
import { ShopCatalogPreview } from "@/components/shop/ShopCatalogPreview";
import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";

type ShopItemCardProps = {
  item: ShopItemView;
  busy?: boolean;
  onClaimFree?: () => void;
  onBuyCoins?: () => void;
  onBuyRub?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  hasSubscription?: boolean;
};

export function ShopItemCard({
  item,
  busy,
  onClaimFree,
  onBuyCoins,
  onBuyRub,
  onEquip,
  onUnequip,
  hasSubscription = false,
}: ShopItemCardProps) {
  const futurePrice = !item.isFree && item.priceCoins > 0;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] transition",
        item.equipped ? "border-(--theme-accent)" : "border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
        item.requiresSubscription && "shop-item-card--plus",
      )}
    >
      <div className="relative aspect-[4/3] bg-black/30">
        <ShopCatalogPreview catalog={item.previewMeta} previewUrl={item.previewUrl} />
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]">
          {shopKindLabel(item.kind)}
        </span>
        {item.equipped && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-(--theme-accent) px-2 py-0.5 text-[11px] text-[var(--foreground)]">
            <Check className="h-3 w-3" aria-hidden />
            Надето
          </span>
        )}
        {item.requiresSubscription ? (
          <VooplePlusBadge className="absolute bottom-2 right-2 shadow-[var(--app-shadow-sm)]" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-[var(--foreground)]">{item.name}</h3>
        {item.description && <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">{item.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {item.isFree ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">Сейчас бесплатно</span>
          ) : (
            <>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 py-1 text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
                {item.priceCoins} voops
              </span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 py-1 text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">{item.priceRub} ₽</span>
            </>
          )}
          {item.isFree && item.priceCoins > 0 && (
            <span className="text-[color-mix(in_srgb,var(--foreground)_35%,transparent)] line-through">{item.priceCoins} voops потом</span>
          )}
          {futurePrice && <Lock className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--foreground)_35%,transparent)]" aria-hidden />}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {!item.owned && item.isFree && onClaimFree && (
            <Button type="button" size="sm" disabled={busy} onClick={onClaimFree}>
              Получить
            </Button>
          )}
          {!item.owned && !item.isFree && onBuyCoins && (
            <Button type="button" size="sm" disabled={busy} onClick={onBuyCoins}>
              Купить за voops
            </Button>
          )}
          {!item.owned && !item.isFree && onBuyRub && (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onBuyRub}>
              Купить за ₽
            </Button>
          )}
          {item.owned && !item.equipped && onEquip && (
            <Button type="button" size="sm" disabled={busy || (item.requiresSubscription && !hasSubscription)} onClick={onEquip}>
              {item.requiresSubscription && !hasSubscription ? "Нужен Вупл+" : "Надеть"}
            </Button>
          )}
          {item.owned && item.equipped && onUnequip && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onUnequip}>
              Снять
            </Button>
          )}
          {item.owned && !item.equipped && (
            <span className="self-center text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">В инвентаре</span>
          )}
        </div>
      </div>
    </article>
  );
}
