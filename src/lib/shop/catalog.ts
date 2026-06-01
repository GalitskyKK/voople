import type { AppThemeId } from "@/lib/app-themes";

export type ShopItemKind =
  | "effect"
  | "ring"
  | "banner"
  | "nameplate"
  | "badge"
  | "reaction_pack"
  | "decoration"
  | "feed_card"
  | "animated_avatar"
  | "app_theme"
  | "nickname_style";

export type ShopEquipSlot =
  | "profile_effect_id"
  | "avatar_ring_id"
  | "banner"
  | "avatar_decoration_id"
  | "feed_card_style_id"
  | "animated_avatar_id"
  | "app_theme_id"
  | "nickname_style";

export type ShopCatalogItem = {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  /** Folder under `/customization/` for preview resolution. */
  assetFolder?: string;
  assetId?: string;
  priceCoins: number;
  priceRub: number;
  isFree: boolean;
  equipSlot: ShopEquipSlot;
  /** Stored value when equipped (theme id, ring id, nickname hex, …). */
  equipValue?: string;
  sortOrder: number;
  seasonId?: string;
};

/** Source of truth for shop metadata; mirrored into `shop_items` via migration seed. */
export const SHOP_CATALOG: ShopCatalogItem[] = [
  {
    id: "banner-minti",
    kind: "banner",
    name: "Minti",
    description: "Мягкий баннер с градиентом для карточки профиля.",
    assetFolder: "banners",
    assetId: "minti",
    priceCoins: 120,
    priceRub: 49,
    isFree: true,
    equipSlot: "banner",
    equipValue: "minti",
    sortOrder: 10,
    seasonId: "launch",
  },
  {
    id: "effect-ladybugs",
    kind: "effect",
    name: "Ladybugs",
    description: "Анимированные божьи коровки поверх профиля.",
    assetFolder: "effects",
    assetId: "ladybugs",
    priceCoins: 180,
    priceRub: 79,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "ladybugs",
    sortOrder: 20,
    seasonId: "launch",
  },
  {
    id: "decoration-sparkle",
    kind: "decoration",
    name: "Sparkle",
    description: "Сияние вокруг аватара.",
    assetFolder: "decorations",
    assetId: "sparkle",
    priceCoins: 150,
    priceRub: 69,
    isFree: true,
    equipSlot: "avatar_decoration_id",
    equipValue: "sparkle",
    sortOrder: 30,
    seasonId: "launch",
  },
  {
    id: "feed-sakura",
    kind: "feed_card",
    name: "Sakura",
    description: "Фон полоски поста в ленте.",
    assetFolder: "feed-cards",
    assetId: "sakura",
    priceCoins: 100,
    priceRub: 59,
    isFree: true,
    equipSlot: "feed_card_style_id",
    equipValue: "sakura",
    sortOrder: 40,
    seasonId: "launch",
  },
  {
    id: "animated-minti",
    kind: "animated_avatar",
    name: "Minti APNG",
    description: "Анимированный аватар вместо буквы.",
    assetFolder: "animated",
    assetId: "minti",
    priceCoins: 220,
    priceRub: 99,
    isFree: true,
    equipSlot: "animated_avatar_id",
    equipValue: "minti",
    sortOrder: 50,
    seasonId: "launch",
  },
  {
    id: "ring-glow-purple",
    kind: "ring",
    name: "Glow Purple",
    description: "Кольцо акцентного цвета вокруг аватара.",
    priceCoins: 80,
    priceRub: 39,
    isFree: true,
    equipSlot: "avatar_ring_id",
    equipValue: "glow-purple",
    sortOrder: 60,
    seasonId: "launch",
  },
  {
    id: "style-neon-pink",
    kind: "nickname_style",
    name: "Neon Pink",
    description: "Градиентное имя в профиле.",
    priceCoins: 90,
    priceRub: 45,
    isFree: true,
    equipSlot: "nickname_style",
    equipValue: "#f9a8d4",
    sortOrder: 70,
    seasonId: "launch",
  },
  {
    id: "theme-violet",
    kind: "app_theme",
    name: "Violet Pulse",
    description: "Фиолетовая тема приложения.",
    assetFolder: "themes",
    assetId: "violet",
    priceCoins: 200,
    priceRub: 89,
    isFree: true,
    equipSlot: "app_theme_id",
    equipValue: "violet",
    sortOrder: 80,
    seasonId: "launch",
  },
  {
    id: "theme-emerald",
    kind: "app_theme",
    name: "Emerald",
    description: "Спокойная зелёная тема.",
    assetFolder: "themes",
    assetId: "emerald",
    priceCoins: 200,
    priceRub: 89,
    isFree: true,
    equipSlot: "app_theme_id",
    equipValue: "emerald",
    sortOrder: 90,
    seasonId: "launch",
  },
  {
    id: "theme-rose",
    kind: "app_theme",
    name: "Neon Rose",
    description: "Яркая розовая тема с оверлеем.",
    assetFolder: "themes",
    assetId: "rose",
    priceCoins: 350,
    priceRub: 149,
    isFree: true,
    equipSlot: "app_theme_id",
    equipValue: "rose",
    sortOrder: 100,
    seasonId: "launch",
  },
  {
    id: "theme-gold",
    kind: "app_theme",
    name: "Gold",
    description: "Тёплая золотая тема с APNG-фоном.",
    assetFolder: "themes",
    assetId: "gold.apng",
    priceCoins: 350,
    priceRub: 149,
    isFree: true,
    equipSlot: "app_theme_id",
    equipValue: "gold",
    sortOrder: 110,
    seasonId: "launch",
  },
];

export const SHOP_CATALOG_BY_ID = new Map(SHOP_CATALOG.map((item) => [item.id, item]));

export const WELCOME_VOOOPS_BONUS = 500;

export function isAppThemeId(value: string): value is AppThemeId {
  return ["void", "violet", "rose", "emerald", "gold"].includes(value);
}

export function getCatalogPreviewPath(item: ShopCatalogItem): string | null {
  if (!item.assetFolder || !item.assetId) return null;
  return `/customization/${item.assetFolder}/${item.assetId}`;
}
