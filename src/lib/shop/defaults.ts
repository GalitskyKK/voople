import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";
import { shopItemDbType } from "@/lib/shop/catalog";

export type ShopKindDefaults = {
  assetFolder: string | null;
  equipSlot: ShopEquipSlot;
};

/** Папка в бакете и слот equip по умолчанию для UI-kind. */
export const SHOP_KIND_DEFAULTS: Record<ShopItemKind, ShopKindDefaults> = {
  banner: { assetFolder: "banners", equipSlot: "banner" },
  profile_background: { assetFolder: "backgrounds", equipSlot: "profile_background_id" },
  effect: { assetFolder: "effects", equipSlot: "profile_effect_id" },
  decoration: { assetFolder: "decorations", equipSlot: "avatar_decoration_id" },
  animated_avatar: { assetFolder: "animated", equipSlot: "animated_avatar_id" },
  feed_card: { assetFolder: "feed-cards", equipSlot: "feed_card_style_id" },
  ring: { assetFolder: null, equipSlot: "avatar_ring_id" },
  nickname_style: { assetFolder: null, equipSlot: "nickname_style" },
  app_theme: { assetFolder: "themes", equipSlot: "app_theme_id" },
  nameplate: { assetFolder: null, equipSlot: "nickname_style" },
  badge: { assetFolder: null, equipSlot: "profile_effect_id" },
  reaction_pack: { assetFolder: null, equipSlot: "profile_effect_id" },
};

export const SHOP_KIND_OPTIONS: { value: ShopItemKind; label: string }[] = [
  { value: "banner", label: "Баннер профиля" },
  { value: "profile_background", label: "Фон карточки" },
  { value: "effect", label: "Эффект профиля" },
  { value: "decoration", label: "Украшение аватара" },
  { value: "animated_avatar", label: "Анимированный аватар" },
  { value: "feed_card", label: "Стиль в ленте" },
  { value: "ring", label: "Кольцо аватара" },
  { value: "nickname_style", label: "Стиль имени" },
  { value: "app_theme", label: "Тема приложения" },
];

export function defaultAssetFolderForKind(kind: ShopItemKind): string | null {
  return SHOP_KIND_DEFAULTS[kind].assetFolder;
}

export function defaultEquipSlotForKind(kind: ShopItemKind): ShopEquipSlot {
  return SHOP_KIND_DEFAULTS[kind].equipSlot;
}

/** UI-kind → Postgres `item_type` (с учётом legacy mapping). */
export function dbTypeForKind(kind: ShopItemKind): string {
  return shopItemDbType(kind);
}

/** Fallback UI-kind из `type`, если колонка `kind` ещё не заполнена. */
export function kindFromDbType(type: string, itemId: string): ShopItemKind {
  if (type === "nameplate") return "nickname_style";
  if (type === "effect" && itemId.startsWith("animated-")) return "animated_avatar";
  return type as ShopItemKind;
}

export function kindRequiresCdnAsset(kind: ShopItemKind): boolean {
  return (
    kind === "banner" ||
    kind === "profile_background" ||
    kind === "decoration" ||
    kind === "animated_avatar" ||
    kind === "feed_card"
  );
}

export function kindSupportsOptionalCdn(kind: ShopItemKind): boolean {
  return kind === "effect" || kind === "app_theme";
}

export function slugifyAssetId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function suggestItemId(name: string, kind: ShopItemKind): string {
  const prefix = kind.replace(/_/g, "-");
  const slug = slugifyAssetId(name).replace(/\./g, "");
  return slug ? `${prefix}-${slug}` : prefix;
}
