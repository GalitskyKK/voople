"use client";

import { Check, Eye, LockKeyhole, ShoppingBag } from "lucide-react";

import { ShopCatalogPreview } from "@/components/shop/ShopCatalogPreview";
import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { AppInternalLink } from "@/components/ui/AppInternalLink";
import { cn } from "@/lib/utils";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";

import { isProfileItemSelected } from "./profile-editor-customization";

type Props = {
  items: ShopItemView[];
  equipped: EquippedCustomizationView | null;
  busy: boolean;
  trialItemId: string | null;
  onApply: (item: ShopItemView) => void;
  onClear: (slot: ShopItemView["equipSlot"]) => void;
  onOpenShop: () => boolean | void;
};

function availabilityLabel(item: ShopItemView) {
  if (item.owned) return "Доступно";
  if (item.requiresSubscription) return "Нужен Вупл+";
  if (item.isFree) return "Получить бесплатно";
  if (item.priceCoins) return `${item.priceCoins.toLocaleString("ru-RU")} вупов`;
  if (item.priceRub) return `${item.priceRub.toLocaleString("ru-RU")} ₽`;
  return "Доступно в магазине";
}

export function ProfileEditorAssetGrid({
  items,
  equipped,
  busy,
  trialItemId,
  onApply,
  onClear,
  onOpenShop,
}: Props) {
  return (
    <div className="profile-editor-assets">
      {items.map((item) => {
        const equippedNow = isProfileItemSelected(item, equipped) && trialItemId !== item.id;
        const previewing = trialItemId === item.id;
        const canEquip = item.owned;

        return (
          <article
            key={item.id}
            className={cn(
              "profile-editor-asset",
              (equippedNow || previewing) && "profile-editor-asset--active",
              !item.owned && "profile-editor-asset--locked",
            )}
          >
            <button
              type="button"
              className="profile-editor-asset__preview"
              disabled={busy}
              onClick={() => (equippedNow ? onClear(item.equipSlot) : onApply(item))}
              aria-label={`${previewing ? "Убрать примерку" : equippedNow ? "Снять" : "Примерить"} ${item.name}`}
            >
              <ShopCatalogPreview catalog={item.previewMeta} previewUrl={item.previewUrl} />
              {item.requiresSubscription ? (
                <VooplePlusBadge className="absolute bottom-2 right-2" locked={!item.owned} />
              ) : null}
              <span className="profile-editor-asset__preview-action">
                {equippedNow ? <Check className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {previewing ? "Убрать примерку" : equippedNow ? "Надето" : "Примерить"}
              </span>
            </button>

            <div className="min-w-0 px-0.5 pb-0.5">
              <strong className="block truncate text-sm font-medium">{item.name}</strong>
              <span className={cn(
                "mt-1 flex items-center gap-1 text-xs",
                equippedNow ? "text-(--theme-accent)" : "text-[var(--app-muted)]",
              )}>
                {canEquip ? <Check className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                {equippedNow ? "Используется сейчас" : availabilityLabel(item)}
              </span>
              <div className="mt-2 flex gap-2">
                {canEquip ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="profile-editor-asset__action"
                    onClick={() => (equippedNow ? onClear(item.equipSlot) : onApply(item))}
                  >
                    {equippedNow ? "Снять" : "Надеть"}
                  </button>
                ) : (
                  <AppInternalLink
                    href="/shop?tab=catalog"
                    className="profile-editor-asset__action"
                    onClick={(event) => {
                      if (onOpenShop() === false) event.preventDefault();
                    }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Получить
                  </AppInternalLink>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
