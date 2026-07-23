import type { AppThemeId } from "@/lib/app-themes";
import { isAppThemeId } from "@/lib/app-themes";
import { profileBackgroundPosterPath } from "@/lib/customization/profile-background-assets";

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
  | "nickname_style"
  | "profile_background"
  | "profile_frame";

export type ShopEquipSlot =
  | "profile_effect_id"
  | "avatar_ring_id"
  | "banner"
  | "avatar_decoration_id"
  | "feed_card_style_id"
  | "animated_avatar_id"
  | "app_theme_id"
  | "nickname_style"
  | "profile_background_id"
  | "profile_frame_id";

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
    description: "Украсьте свой баннер",
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
    id: "bg-blue-flowers",
    kind: "profile_background",
    name: "Blue Flowers",
    description: "Впечатляйте анимированным фоном карточки",
    assetFolder: "backgrounds",
    assetId: "background_blue_flowers-static.jpg",
    priceCoins: 150,
    priceRub: 69,
    isFree: true,
    equipSlot: "profile_background_id",
    equipValue: "background_blue_flowers",
    sortOrder: 15,
    seasonId: "launch",
  },
  {
    id: "effect-ladybugs",
    kind: "effect",
    name: "Ladybugs",
    description: "Впечатляйте эффектом профиля",
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
    id: "effect-fireflies",
    kind: "effect",
    name: "Fireflies",
    description: "Впечатляйте эффектом профиля",
    assetFolder: "effects",
    assetId: "effect_fireflies",
    priceCoins: 180,
    priceRub: 79,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "effect_fireflies",
    sortOrder: 21,
    seasonId: "launch",
  },
  {
    id: "effect-snowfall",
    kind: "effect",
    name: "Snowfall",
    description: "Впечатляйте эффектом профиля",
    assetFolder: "effects",
    assetId: "effect_snowfall",
    priceCoins: 180,
    priceRub: 79,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "effect_snowfall",
    sortOrder: 22,
    seasonId: "launch",
  },
  {
    id: "effect-glitch-sparks",
    kind: "effect",
    name: "Glitch Sparks",
    description: "Впечатляйте эффектом профиля",
    assetFolder: "effects",
    assetId: "effect_glitch_sparks",
    priceCoins: 200,
    priceRub: 89,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "effect_glitch_sparks",
    sortOrder: 23,
    seasonId: "launch",
  },
  {
    id: "effect-petal-fall",
    kind: "effect",
    name: "Petal Fall",
    description: "Впечатляйте эффектом профиля",
    assetFolder: "effects",
    assetId: "effect_petal_fall",
    priceCoins: 180,
    priceRub: 79,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "effect_petal_fall",
    sortOrder: 24,
    seasonId: "launch",
  },
  {
    // CSS-эффект (частицы рисуются кодом, без файла) — equipValue = id пресета
    // из src/lib/customization/effects-registry.ts.
    id: "effect-css-snow",
    kind: "effect",
    name: "Снег (CSS)",
    description: "Лёгкий снегопад без тяжёлого файла",
    priceCoins: 160,
    priceRub: 69,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "snow",
    sortOrder: 25,
    seasonId: "launch",
  },
  {
    id: "effect-css-confetti",
    kind: "effect",
    name: "Конфетти (CSS)",
    description: "Праздничное конфетти поверх карточки",
    priceCoins: 160,
    priceRub: 69,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "confetti",
    sortOrder: 26,
    seasonId: "launch",
  },
  {
    id: "effect-css-sparkles",
    kind: "effect",
    name: "Искры (CSS)",
    description: "Мерцающие искры",
    priceCoins: 160,
    priceRub: 69,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "sparkles",
    sortOrder: 27,
    seasonId: "launch",
  },
  {
    id: "effect-css-fireflies",
    kind: "effect",
    name: "Светлячки (CSS)",
    description: "Плавно дрейфующие огоньки",
    priceCoins: 160,
    priceRub: 69,
    isFree: true,
    equipSlot: "profile_effect_id",
    equipValue: "fireflies",
    sortOrder: 28,
    seasonId: "launch",
  },
  {
    id: "decoration-sparkle",
    kind: "decoration",
    name: "Sparkle",
    description: "Преобразите свой аватар",
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
    description: "Выделите свою карточку среди других",
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
    description: "Анимированный аватар",
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
    description: "Преобразите свой аватар",
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
    description: "Выделите своё имя эффектом",
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
    description: "Фиолетовая тема интерфейса (цвета shell)",
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
    description: "Зелёная тема интерфейса (цвета shell)",
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
    description: "Розовая тема интерфейса (цвета shell)",
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
    description: "Золотая тема интерфейса (цвета shell)",
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

export { isAppThemeId } from "@/lib/app-themes";

export const SHOP_CATALOG_BY_ID = new Map(SHOP_CATALOG.map((item) => [item.id, item]));

export const SHOP_CATALOG_IDS = SHOP_CATALOG.map((item) => item.id);

export const WELCOME_VOOOPS_BONUS = 500;

export function getCatalogPreviewPath(item: ShopCatalogItem): string | null {
  if (item.kind === "profile_background" && item.equipValue) {
    return profileBackgroundPosterPath(item.equipValue);
  }
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
    case "profile_frame":
      return "effect";
    default:
      return kind;
  }
}
