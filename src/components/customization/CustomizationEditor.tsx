"use client";

import { useMemo } from "react";

import { isAppThemeId } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import { Button } from "@/components/ui/Button";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileEffect } from "@/components/profile/ProfileEffect";
import { resolveCustomization } from "@/lib/customization/resolve";

type CustomizationEditorProps = {
  items: ShopItemView[];
  equipped: EquippedCustomizationView;
  busy?: boolean;
  onEquip: (itemId: string) => void;
  onClearSlot: (slot: string) => void;
};

const SLOT_GROUPS: { slot: ShopItemView["equipSlot"]; title: string }[] = [
  { slot: "banner", title: "Баннер профиля" },
  { slot: "profile_effect_id", title: "Эффект профиля" },
  { slot: "avatar_decoration_id", title: "Украшение аватара" },
  { slot: "animated_avatar_id", title: "Анимированный аватар" },
  { slot: "avatar_ring_id", title: "Кольцо аватара" },
  { slot: "feed_card_style_id", title: "Стиль поста в ленте" },
  { slot: "nickname_style", title: "Стиль имени" },
  { slot: "app_theme_id", title: "Тема приложения" },
];

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
    if (item.equipSlot === "app_theme_id" && item.id.startsWith("theme-")) {
      const themeId = item.id.replace("theme-", "");
      if (isAppThemeId(themeId)) {
        setThemeId(themeId);
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {SLOT_GROUPS.map(({ slot, title }) => {
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
                      if (slot === "app_theme_id") setThemeId("void");
                    }}
                  >
                    Снять
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slotItems.map((item) => (
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
                      {item.previewUrl ? (
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
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Превью профиля</h3>
        <article
          className="relative overflow-hidden rounded-2xl border border-white/10"
          style={
            {
              "--theme-primary": previewCustomization.themePrimary,
              "--theme-accent": previewCustomization.themeAccent,
              background: "var(--theme-primary)",
            } as React.CSSProperties
          }
        >
          <ProfileBanner customization={previewCustomization} />
          {previewCustomization.flags.hasProfileEffect && previewCustomization.assets.profileEffectUrl && (
            <ProfileEffect effectUrl={previewCustomization.assets.profileEffectUrl} />
          )}
          <div className="relative z-10 px-4 pb-4">
            <div className="-mt-9">
              <ProfileAvatar
                displayName="Preview"
                ring={previewCustomization.flags.hasAvatarRing}
                decorationUrl={previewCustomization.assets.avatarDecorationUrl}
                animatedAvatarUrl={previewCustomization.assets.animatedAvatarUrl}
              />
            </div>
            <p
              className={cn(
                "mt-3 text-lg font-bold text-white",
                previewCustomization.displayName.gradient &&
                  previewCustomization.flags.hasDisplayNameStyle &&
                  "bg-clip-text text-transparent",
              )}
              style={
                previewCustomization.flags.hasDisplayNameStyle
                  ? previewCustomization.displayName.gradient
                    ? {
                        backgroundImage: `linear-gradient(90deg, ${previewCustomization.displayName.color ?? "#e5e5e5"}, #fff)`,
                      }
                    : { color: previewCustomization.displayName.color ?? undefined }
                  : undefined
              }
            >
              Твоё имя
            </p>
            <p className="text-sm text-white/50">@username</p>
          </div>
        </article>
      </aside>
    </div>
  );
}
