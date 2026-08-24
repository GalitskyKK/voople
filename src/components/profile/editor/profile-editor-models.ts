import type { CardBaseMode, NicknameEffect, NicknameFont } from "@/lib/customization/types";
import type { ShopItemView } from "@/types/shop";

export type ProfileEditorGroupTag = {
  chatId: string;
  tag: string;
  groupName: string;
  accentColor: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
};

export type ProfileEditorPanel =
  | "profile"
  | "tag"
  | "avatar"
  | "banner"
  | "frame"
  | "feed"
  | "name";

export type EditorCustomizationPatch = {
  profileFrameId?: string | null;
  frameColor?: string | null;
  cardBaseMode?: CardBaseMode | null;
  nicknameColor?: string | null;
  nicknameGradient?: boolean;
  nicknameFont?: NicknameFont | null;
  nicknameEffect?: NicknameEffect | null;
};

export const PROFILE_EDITOR_PANELS: Array<{
  id: ProfileEditorPanel;
  label: string;
  hint: string;
}> = [
  { id: "profile", label: "Основной профиль", hint: "Имя и описание" },
  { id: "tag", label: "Тег сообщества", hint: "Идентичность рядом с именем" },
  { id: "avatar", label: "Аватар и украшение", hint: "Фото, украшение и кольцо" },
  { id: "banner", label: "Баннер и фон", hint: "Верх и основа карточки" },
  { id: "frame", label: "Рамка карточки", hint: "Оформление по периметру" },
  { id: "feed", label: "Бейдж в ленте", hint: "Табличка автора публикации" },
  { id: "name", label: "Стиль имени", hint: "Цвет и градиент" },
];

export const AVATAR_ASSET_GROUPS: Array<{
  kind: ShopItemView["kind"];
  title: string;
}> = [
  { kind: "decoration", title: "Украшения" },
  { kind: "ring", title: "Кольца аватара" },
  { kind: "animated_avatar", title: "Анимированные аватары" },
];

export const BANNER_ASSET_GROUPS: Array<{
  kind: ShopItemView["kind"];
  title: string;
}> = [
  { kind: "banner", title: "Баннер" },
  { kind: "profile_background", title: "Фон основной части" },
];

export const PROFILE_BASE_MODES: Array<{
  id: CardBaseMode;
  label: string;
  premium: boolean;
}> = [
  { id: "mirror", label: "Продолжение баннера", premium: false },
  { id: "theme", label: "Цвета профиля", premium: true },
  { id: "plain", label: "Спокойный фон", premium: true },
];
