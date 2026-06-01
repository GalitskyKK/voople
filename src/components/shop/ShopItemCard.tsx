"use client";

import { Check, Lock } from "lucide-react";

import { SHOP_CATALOG_BY_ID } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";
import type { ShopItemView } from "@/types/shop";
import { Button } from "@/components/ui/Button";

const KIND_LABELS: Record<ShopItemView["kind"], string> = {
  effect: "Эффект",
  ring: "Кольцо",
  banner: "Баннер",
  nameplate: "Табличка",
  badge: "Значок",
  reaction_pack: "Реакции",
  decoration: "Украшение",
  feed_card: "Лента",
  animated_avatar: "Аватар",
  app_theme: "Тема",
  nickname_style: "Имя",
};

type ShopItemCardProps = {
  item: ShopItemView;
  busy?: boolean;
  onClaimFree?: () => void;
  onBuyCoins?: () => void;
  onBuyRub?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
};

export function ShopItemCard({
  item,
  busy,
  onClaimFree,
  onBuyCoins,
  onBuyRub,
  onEquip,
  onUnequip,
}: ShopItemCardProps) {
  const catalog = SHOP_CATALOG_BY_ID.get(item.id);
  const futurePrice = !item.isFree && item.priceCoins > 0;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-white/5 transition",
        item.equipped ? "border-(--theme-accent)" : "border-white/10",
      )}
    >
      <div className="relative aspect-[4/3] bg-black/30">
        {item.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- CDN customization previews
          <img
            src={item.previewUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/30">Нет превью</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white/80">
          {KIND_LABELS[item.kind]}
        </span>
        {item.equipped && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-(--theme-accent) px-2 py-0.5 text-[11px] text-white">
            <Check className="h-3 w-3" aria-hidden />
            Надето
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-white">{item.name}</h3>
        {item.description && <p className="mt-1 text-sm text-white/50">{item.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {item.isFree ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">Сейчас бесплатно</span>
          ) : (
            <>
              <span className="rounded-full bg-white/10 px-2 py-1 text-white/70">
                {item.priceCoins} voops
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-white/70">{item.priceRub} ₽</span>
            </>
          )}
          {item.isFree && catalog && catalog.priceCoins > 0 && (
            <span className="text-white/35 line-through">{catalog.priceCoins} voops потом</span>
          )}
          {futurePrice && <Lock className="h-3.5 w-3.5 text-white/35" aria-hidden />}
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
            <Button type="button" size="sm" disabled={busy} onClick={onEquip}>
              Надеть
            </Button>
          )}
          {item.owned && item.equipped && onUnequip && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onUnequip}>
              Снять
            </Button>
          )}
          {item.owned && !item.equipped && (
            <span className="self-center text-xs text-white/40">В инвентаре</span>
          )}
        </div>
      </div>
    </article>
  );
}
