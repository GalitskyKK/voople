import type { ShopItemKind, ShopEquipSlot } from "@/lib/shop/catalog";
import type { ShopItemView } from "@/types/shop";

/** Секции магазина / настройки — как у Discord (профиль → аватар → лента → интерфейс). */
export type ShopDisplaySectionId =
  | "profile_banner"
  | "profile_card_bg"
  | "profile_effect"
  | "avatar"
  | "profile_name"
  | "feed"
  | "app_shell";

export type ShopDisplaySection = {
  id: ShopDisplaySectionId;
  title: string;
  /** Одна строка под заголовком, без тех. деталей. */
  hint: string;
  kinds: ShopItemKind[];
};

export const SHOP_DISPLAY_SECTIONS: ShopDisplaySection[] = [
  {
    id: "profile_banner",
    title: "Баннер профиля",
    hint: "Украсьте свой баннер",
    kinds: ["banner"],
  },
  {
    id: "profile_card_bg",
    title: "Фон карточки",
    hint: "Анимированный фон профиля",
    kinds: ["profile_background"],
  },
  {
    id: "profile_effect",
    title: "Рамки карточки",
    hint: "Оформление профиля",
    kinds: ["profile_frame"],
  },
  {
    id: "avatar",
    title: "Аватар",
    hint: "Преобразите свой аватар",
    kinds: ["animated_avatar", "decoration", "ring"],
  },
  {
    id: "profile_name",
    title: "Имя в профиле",
    hint: "Выделите своё имя эффектом",
    kinds: ["nickname_style"],
  },
  {
    id: "feed",
    title: "Лента",
    hint: "Выделите свою карточку среди других",
    kinds: ["feed_card"],
  },
  {
    id: "app_shell",
    title: "Тема приложения",
    hint: "Измените тему интерфейса Voople",
    kinds: ["app_theme"],
  },
];

/** Порядок слотов на вкладке «Настройка» (как Discord: профиль сверху, тема shell отдельно). */
export const CUSTOMIZE_SLOT_SECTIONS: {
  slot: ShopEquipSlot;
  title: string;
  sectionId: ShopDisplaySectionId;
}[] = [
  { slot: "profile_frame_id", title: "Рамка карточки", sectionId: "profile_effect" },
  { slot: "banner", title: "Баннер профиля", sectionId: "profile_banner" },
  { slot: "profile_background_id", title: "Фон карточки", sectionId: "profile_card_bg" },
  // Эффекты профиля заменены рамкой карточки (панель «Рамка» в редакторе) — слот скрыт.
  { slot: "animated_avatar_id", title: "Анимированный аватар", sectionId: "avatar" },
  { slot: "avatar_decoration_id", title: "Украшение аватара", sectionId: "avatar" },
  { slot: "avatar_ring_id", title: "Кольцо", sectionId: "avatar" },
  { slot: "nickname_style", title: "Стиль имени", sectionId: "profile_name" },
  { slot: "feed_card_style_id", title: "Стиль в ленте", sectionId: "feed" },
  { slot: "app_theme_id", title: "Тема приложения", sectionId: "app_shell" },
];

const KIND_LABEL: Record<ShopItemKind, string> = {
  profile_frame: "Рамка карточки",
  banner: "Баннер",
  profile_background: "Фон карточки",
  effect: "Эффект профиля",
  decoration: "Украшение аватара",
  animated_avatar: "Анимированный аватар",
  feed_card: "Лента",
  ring: "Кольцо аватара",
  nickname_style: "Имя",
  app_theme: "Тема приложения",
  nameplate: "Табличка",
  badge: "Значок",
  reaction_pack: "Реакции",
};

export function shopKindLabel(kind: ShopItemKind): string {
  return KIND_LABEL[kind] ?? kind;
}

export function shopSectionForKind(kind: ShopItemKind): ShopDisplaySection | undefined {
  return SHOP_DISPLAY_SECTIONS.find((section) => section.kinds.includes(kind));
}

export function groupShopItemsBySection(items: ShopItemView[]): {
  section: ShopDisplaySection;
  items: ShopItemView[];
}[] {
  const used = new Set<string>();
  const result: { section: ShopDisplaySection; items: ShopItemView[] }[] = [];

  for (const section of SHOP_DISPLAY_SECTIONS) {
    const sectionItems = items.filter((item) => section.kinds.includes(item.kind));
    sectionItems.forEach((item) => used.add(item.id));
    if (sectionItems.length > 0) {
      result.push({ section, items: sectionItems });
    }
  }

  const orphan = items.filter((item) => !used.has(item.id));
  if (orphan.length > 0) {
    result.push({
      section: {
        id: "profile_effect",
        title: "Другое",
        hint: "",
        kinds: [],
      },
      items: orphan,
    });
  }

  return result;
}
