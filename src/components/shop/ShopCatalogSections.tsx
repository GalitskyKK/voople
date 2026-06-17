"use client";

import { groupShopItemsBySection } from "@/lib/shop/categories";
import type { ShopItemView } from "@/types/shop";
import { ShopItemCard } from "@/components/shop/ShopItemCard";

type ShopCatalogSectionsProps = {
  items: ShopItemView[];
  busy?: boolean;
  onClaimFree?: (itemId: string) => void;
  onBuyCoins?: (itemId: string) => void;
  onBuyRub?: (itemId: string) => void;
  onEquip?: (item: ShopItemView) => void;
  onUnequip?: (item: ShopItemView) => void;
};

export function ShopCatalogSections({
  items,
  busy,
  onClaimFree,
  onBuyCoins,
  onBuyRub,
  onEquip,
  onUnequip,
}: ShopCatalogSectionsProps) {
  const sections = groupShopItemsBySection(items);

  if (sections.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] p-8 text-center text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
        В каталоге пока нет предметов.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(({ section, items: sectionItems }) => (
        <section key={section.id} className="space-y-3">
          <header>
            <h2 className="text-base font-semibold text-[var(--foreground)]">{section.title}</h2>
            {section.hint ? <p className="mt-0.5 text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">{section.hint}</p> : null}
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sectionItems.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                busy={busy}
                onClaimFree={onClaimFree ? () => onClaimFree(item.id) : undefined}
                onBuyCoins={onBuyCoins ? () => onBuyCoins(item.id) : undefined}
                onBuyRub={onBuyRub ? () => onBuyRub(item.id) : undefined}
                onEquip={onEquip ? () => onEquip(item) : undefined}
                onUnequip={onUnequip ? () => onUnequip(item) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
