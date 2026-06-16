"use client";

import { useMemo } from "react";

import { SHOP_CATALOG_BY_ID, catalogAppThemeId } from "@/lib/shop/catalog";
import { CUSTOMIZE_SLOT_SECTIONS, SHOP_DISPLAY_SECTIONS } from "@/lib/shop/categories";
import { applyEquippedAppTheme } from "@/lib/shop/app-theme-client";
import { cn } from "@/lib/utils";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import { Button } from "@/components/ui/Button";
import { ShopCatalogPreview } from "@/components/shop/ShopCatalogPreview";
import {
  ProfileCardEffectLayer,
  ProfileCardHeader,
  profileCardThemeStyle,
} from "@/components/profile/ProfileCardHeader";
import { resolveCustomization } from "@/lib/customization/resolve";

type CustomizationEditorProps = {
  items: ShopItemView[];
  equipped: EquippedCustomizationView;
  busy?: boolean;
  onEquip: (itemId: string) => void;
  onClearSlot: (slot: string) => void;
};

export function CustomizationEditor({
  items,
  equipped,
  busy,
  onEquip,
  onClearSlot,
}: CustomizationEditorProps) {
  const { setThemeId } = useAppTheme();

  const previewCustomization = useMemo(() => {
    const resolved = resolveCustomization({
      bannerId: equipped.bannerId,
      profileEffectId: equipped.profileEffectId,
      avatarRingId: equipped.avatarRingId,
      avatarDecorationId: equipped.avatarDecorationId,
      feedCardStyleId: equipped.feedCardStyleId,
      animatedAvatarId: equipped.animatedAvatarId,
      nicknameColor: equipped.nicknameColor,
      nicknameGradient: equipped.nicknameGradient,
    });

    return {
      ...resolved,
      bannerValue: {
        color: resolved.themePrimary,
        url: resolved.assets.bannerUrl ?? undefined,
      },
    };
  }, [equipped]);

  const handleEquip = (item: ShopItemView) => {
    onEquip(item.id);
    const catalog = SHOP_CATALOG_BY_ID.get(item.id);
    const themeId = catalog ? catalogAppThemeId(catalog) : null;
    if (themeId) setThemeId(themeId);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {SHOP_DISPLAY_SECTIONS.map((displaySection) => {
          const slotsInSection = CUSTOMIZE_SLOT_SECTIONS.filter(
            (s) => s.sectionId === displaySection.id,
          );
          const sectionHasItems = slotsInSection.some((s) =>
            items.some((item) => item.equipSlot === s.slot),
          );
          if (!sectionHasItems) return null;

          return (
            <div key={displaySection.id} className="space-y-3">
              <header>
                <h2 className="text-base font-semibold text-white">{displaySection.title}</h2>
                {displaySection.hint ? (
                  <p className="mt-0.5 text-sm text-white/45">{displaySection.hint}</p>
                ) : null}
              </header>
              {slotsInSection.map(({ slot, title }) => {
                const slotItems = items.filter((item) => item.equipSlot === slot);
                if (slotItems.length === 0) return null;

                return (
            <section key={slot} className="voople-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {slotItems.some((item) => item.equipped) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      onClearSlot(slot);
                      if (slot === "app_theme_id") applyEquippedAppTheme(setThemeId, null);
                    }}
                  >
                    Снять
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slotItems.map((item) => {
                  const catalog = SHOP_CATALOG_BY_ID.get(item.id);
                  return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleEquip(item)}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left transition",
                      item.equipped
                        ? "border-(--theme-accent) bg-white/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5",
                    )}
                  >
                    <div className="aspect-square bg-black/30">
                      {catalog ? (
                        <ShopCatalogPreview catalog={catalog} previewUrl={item.previewUrl} />
                      ) : item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-white/30">
                          {item.name}
                        </div>
                      )}
                    </div>
                    <span className="block px-2 py-2 text-xs text-white/75">{item.name}</span>
                  </button>
                  );
                })}
              </div>
            </section>
                );
              })}
            </div>
          );
        })}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <h3 className="text-sm font-semibold text-white">Превью профиля</h3>
        <article
          className="profile-card voople-profile-card relative w-full max-w-[320px] rounded-2xl border border-white/10"
          style={profileCardThemeStyle(previewCustomization)}
        >
          <ProfileCardEffectLayer customization={previewCustomization} />
          <ProfileCardHeader
            customization={previewCustomization}
            displayName="Твоё имя"
            username="username"
            compact
          />
        </article>
      </aside>
    </div>
  );
}
