"use client";

import { useMemo } from "react";

import { isAppThemeId } from "@/lib/app-themes";
import { CUSTOMIZE_SLOT_SECTIONS, SHOP_DISPLAY_SECTIONS } from "@/lib/shop/categories";
import { applyEquippedAppTheme, clearEquippedAppTheme } from "@/lib/shop/app-theme-client";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { FRAME_PRESETS, type FramePreset } from "@/lib/customization/frames-registry";
import type { CardBaseMode } from "@/lib/customization/types";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import { Button } from "@/components/ui/Button";
import { ProfileThemePicker } from "@/components/customization/ProfileThemePicker";
import { ShopCatalogPreview } from "@/components/shop/ShopCatalogPreview";
import {
  ProfileCardHeader,
  profileCardThemeStyle,
} from "@/components/profile/ProfileCardHeader";
import { ProfileCardVideoSections } from "@/components/profile/ProfileCardVideoSections";
import { frameLayerProps } from "@/components/profile/ProfileCardFrame";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { resolveCustomization } from "@/lib/customization/resolve";

/** Мини-превью заливки рамки для сетки выбора. */
function frameSwatchStyle(preset: FramePreset, customColor: string): React.CSSProperties {
  const c1 = preset.usesCustomColor ? customColor : preset.colors[0];
  switch (preset.kind) {
    case "gradient":
      return { background: `linear-gradient(135deg, ${preset.colors.join(", ")})` };
    case "glow":
      return {
        background: c1,
        boxShadow: `0 0 10px 1px ${preset.colors[1] ?? c1}`,
      };
    case "glass":
      return { background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" };
    case "image":
      return preset.imageBase
        ? { backgroundImage: `url(/customization/frames/${preset.imageBase}.webp)`, backgroundSize: "cover" }
        : { background: c1 };
    default:
      return { background: c1 };
  }
}

const BASE_MODE_OPTIONS: { id: CardBaseMode; label: string; premium: boolean }[] = [
  { id: "mirror", label: "Зеркало баннера", premium: false },
  { id: "theme", label: "Градиент темы", premium: true },
  { id: "plain", label: "Ровный фон", premium: true },
];

type CustomizationEditorProps = {
  items: ShopItemView[];
  equipped: EquippedCustomizationView;
  busy?: boolean;
  /** Активна ли подписка Voople+ (для темы профиля). */
  isPlus?: boolean;
  onEquip: (itemId: string) => void;
  onClearSlot: (slot: string) => void;
};

export function CustomizationEditor({
  items,
  equipped,
  busy,
  isPlus = false,
  onEquip,
  onClearSlot,
}: CustomizationEditorProps) {
  const { setThemeId } = useAppTheme();
  const utils = trpc.useUtils();

  const update = trpc.customization.update.useMutation({
    onSuccess: () => {
      void utils.customization.getEquipped.invalidate();
      void utils.shop.overview.invalidate();
    },
  });

  const frameId = equipped.profileFrameId;
  const frameColor = equipped.frameColor ?? "#7B3AED";
  const baseMode = (equipped.cardBaseMode as CardBaseMode | null) ?? "mirror";
  const editBusy = busy || update.isPending;

  const previewCustomization = useMemo(() => {
    const resolved = resolveCustomization({
      bannerId: equipped.bannerId,
      profileEffectId: equipped.profileEffectId,
      profileBackgroundId: equipped.profileBackgroundId,
      profileFrameId: equipped.profileFrameId,
      frameColor: equipped.frameColor,
      cardBaseMode: equipped.cardBaseMode,
      avatarRingId: equipped.avatarRingId,
      avatarDecorationId: equipped.avatarDecorationId,
      feedCardStyleId: equipped.feedCardStyleId,
      animatedAvatarId: equipped.animatedAvatarId,
      nicknameColor: equipped.nicknameColor,
      nicknameGradient: equipped.nicknameGradient,
      themePrimary: equipped.themePrimary,
      themeAccent: equipped.themeAccent,
    });

    return {
      ...resolved,
      bannerValue: {
        color: resolved.themePrimary,
        url: resolved.assets.bannerUrl ?? undefined,
      },
    };
  }, [equipped]);

  const previewFrame = frameLayerProps(previewCustomization.assets.frame);

  const handleEquip = (item: ShopItemView) => {
    onEquip(item.id);
    if (item.kind === "app_theme" && item.equipValue && isAppThemeId(item.equipValue)) {
      setThemeId(item.equipValue);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="voople-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Рамка карточки</h3>
              <p className="mt-0.5 text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
                Подложка вокруг карточки: цвет, градиент или стекло.
              </p>
            </div>
            {frameId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={editBusy}
                onClick={() => update.mutate({ profileFrameId: null, frameColor: null })}
              >
                Снять
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Object.values(FRAME_PRESETS).map((preset) => {
              const locked = (preset.isPremium || preset.usesCustomColor) && !isPlus;
              const selected = frameId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={editBusy || locked}
                  title={locked ? `${preset.name} · Voople+` : preset.name}
                  onClick={() => update.mutate({ profileFrameId: preset.id })}
                  className={cn(
                    "overflow-hidden rounded-xl border text-left transition disabled:opacity-50",
                    selected
                      ? "border-(--theme-accent)"
                      : "border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--foreground)_25%,transparent)]",
                  )}
                >
                  <div className="aspect-square" style={frameSwatchStyle(preset, frameColor)} />
                  <span className="block px-2 py-1.5 text-[11px] text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]">
                    {preset.name}
                    {locked ? " 🔒" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {frameId === "frame-custom" ? (
            <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
              Цвет рамки
              <input
                type="color"
                value={frameColor}
                disabled={editBusy || !isPlus}
                onChange={(e) =>
                  update.mutate({ profileFrameId: "frame-custom", frameColor: e.target.value })
                }
                className="h-8 w-12 cursor-pointer rounded border border-[color-mix(in_srgb,var(--foreground)_15%,transparent)] bg-transparent disabled:cursor-not-allowed"
              />
            </label>
          ) : null}
          {!isPlus ? (
            <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
              Свой цвет и премиум-рамки — с Voople+.
            </p>
          ) : null}
        </section>

        <section className="voople-panel space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Основа карточки</h3>
            <p className="mt-0.5 text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
              Что под контентом: зеркало баннера (по умолчанию) или свой фон.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {BASE_MODE_OPTIONS.map((opt) => {
              const locked = opt.premium && !isPlus;
              const selected = baseMode === opt.id;
              return (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={selected ? "primary" : "secondary"}
                  disabled={editBusy || locked}
                  onClick={() => update.mutate({ cardBaseMode: opt.id })}
                >
                  {opt.label}
                  {locked ? " 🔒" : ""}
                </Button>
              );
            })}
          </div>
        </section>

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
                <h2 className="text-base font-semibold text-[var(--foreground)]">{displaySection.title}</h2>
                {displaySection.hint ? (
                  <p className="mt-0.5 text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">{displaySection.hint}</p>
                ) : null}
              </header>
              {slotsInSection.map(({ slot, title }) => {
                const slotItems = items.filter((item) => item.equipSlot === slot);
                if (slotItems.length === 0) return null;

                return (
            <section key={slot} className="voople-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
                {slotItems.some((item) => item.equipped) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      onClearSlot(slot);
                      if (slot === "app_theme_id") clearEquippedAppTheme(setThemeId);
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
                        ? "border-(--theme-accent) bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/20 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]",
                    )}
                  >
                    <div className="aspect-square bg-black/30">
                      <ShopCatalogPreview catalog={item.previewMeta} previewUrl={item.previewUrl} />
                    </div>
                    <span className="block px-2 py-2 text-xs text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]">{item.name}</span>
                  </button>
                ))}
              </div>
            </section>
                );
              })}
            </div>
          );
        })}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Превью профиля</h3>
        <article
          className={cn(
            "profile-card voople-profile-card relative w-full max-w-[320px]",
            previewFrame.className,
            previewCustomization.flags.hasBannerMedia && "profile-card--split",
            !previewCustomization.flags.hasBannerMedia &&
              "rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
          )}
          style={{ ...profileCardThemeStyle(previewCustomization), ...previewFrame.style }}
        >
          {previewCustomization.flags.hasBannerMedia &&
          previewCustomization.assets.bannerMedia.kind !== "none" ? (
            <ProfileCardVideoSections
              media={previewCustomization.assets.bannerMedia}
              baseMode={previewCustomization.cardBaseMode}
              header={
                <ProfileCardHeader
                  customization={previewCustomization}
                  displayName="Твоё имя"
                  username="username"
                  compact
                  showBanner={false}
                />
              }
            />
          ) : (
            <>
              <div className="relative z-[2] overflow-hidden rounded-t-2xl">
                <ProfileBanner customization={previewCustomization} />
              </div>
              <div className="relative z-10">
                <ProfileCardHeader
                  customization={previewCustomization}
                  displayName="Твоё имя"
                  username="username"
                  compact
                  showBanner={false}
                />
              </div>
            </>
          )}
        </article>

        <div className="voople-panel p-4">
          <ProfileThemePicker
            themePrimary={equipped.themePrimary}
            themeAccent={equipped.themeAccent}
            isPlus={isPlus}
            onSaved={() => {
              void utils.customization.getEquipped.invalidate();
              void utils.shop.overview.invalidate();
            }}
          />
        </div>
      </aside>
    </div>
  );
}
