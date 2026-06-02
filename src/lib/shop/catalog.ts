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
  /**
   * CDN: `assetFolder` + `assetId` → файл в бакете.
   * CSS: поля не задавать — рендер из `equipValue` + `src/lib/app-themes.ts` (темы) / стили в UI (кольцо, ник).
   */
  assetFolder?: string;
  /** File name in bucket; include extension when not `.webp` (e.g. `minti.apng`). */
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

/**
 * Единственный источник правды для магазина (метаданные и цены).
 *
 * Синхронизация с Supabase: скопировать SQL из `drizzle/shop-catalog-upsert.sql`
 * в SQL Editor (см. docs/shop-catalog.md) — терминал не обязателен.
 *
 * CDN-предмет: файл в бакете + `assetFolder` / `assetId`.
 * CSS-предмет: без бакета; для `app_theme` нужна запись в `src/lib/app-themes.ts`.
 */
export const SHOP_CATALOG: ShopCatalogItem[] = [
  {
    id: "banner-minti",
    kind: "banner",
    name: "Minti",
    description: "Мятный градиент для профиля.",
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
    description: "Божьи коровки на карточке.",
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
    description: "Блёстки вокруг аватара.",
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
    description: "Сакура в ленте.",
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
    name: "Minti",
    description: "Анимация Minti в аватаре.",
    assetFolder: "animated",
    assetId: "minti.apng",
    priceCoins: 220,
    priceRub: 99,
    isFree: true,
    equipSlot: "animated_avatar_id",
    equipValue: "minti.apng",
    sortOrder: 50,
    seasonId: "launch",
  },
  {
    id: "ring-glow-purple",
    kind: "ring",
    name: "Glow Purple",
    description: "Фиолетовая обводка.",
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
    description: "Розовый градиент имени.",
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
    description: "Фиолетовый интерфейс.",
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
    description: "Зелёный интерфейс.",
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
    description: "Розовый интерфейс.",
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
    description: "Золотой интерфейс.",
    priceCoins: 350,
    priceRub: 149,
    isFree: true,
    equipSlot: "app_theme_id",
    equipValue: "gold",
    sortOrder: 110,
    seasonId: "launch",
  },
];

export function catalogAppThemeId(item: ShopCatalogItem): AppThemeId | null {
  if (item.kind !== "app_theme" || !item.equipValue) return null;
  return isAppThemeId(item.equipValue) ? item.equipValue : null;
}

export const SHOP_CATALOG_BY_ID = new Map(SHOP_CATALOG.map((item) => [item.id, item]));

export const SHOP_CATALOG_IDS = SHOP_CATALOG.map((item) => item.id);

export const WELCOME_VOOOPS_BONUS = 500;

export function isAppThemeId(value: string): value is AppThemeId {
  return ["void", "violet", "rose", "emerald", "gold"].includes(value);
}

export function getCatalogPreviewPath(item: ShopCatalogItem): string | null {
  if (!item.assetFolder || !item.assetId) return null;
  return `/customization/${item.assetFolder}/${item.assetId}`;
}

/**
 * Значение колонки `shop_items.type` (Postgres enum `item_type`).
 * UI-kind (`ShopItemKind`) может отличаться — см. `mapShopItemRow` (catalog по id).
 */
export function shopItemDbType(kind: ShopItemKind): string {
  switch (kind) {
    case "animated_avatar":
      return "effect";
    case "nickname_style":
      return "nameplate";
    default:
      return kind;
  }
}
