/**
 * Реестр рамок карточки профиля. Рамка — кольцо-паддинг (~10px) вокруг всей карточки
 * (баннер + основа как единый блок). Заменяет эффекты профиля (см. docs/customization.md).
 *
 * Источник правды и для рендера на профиле, и для превью в магазине.
 * Рамка из магазина / кастомизации ссылается на пресет по id (`profile_frame_id`).
 *
 * Виды (`kind`):
 * - `solid`   — сплошной цвет кольца.
 * - `gradient`— градиент по кольцу.
 * - `glow`    — цвет + внешнее свечение (box-shadow).
 * - `glass`   — прозрачная с backdrop-blur («стекло»).
 * - `image`   — цельная прозрачная overlay-рамка из бакета `customization/frames/`.
 *              Тип и resolve-путь готовы; сами item'ы появятся, когда ассеты зальют.
 *
 * `usesCustomColor: true` → пресет берёт `frame_color` (кастомный цвет Voople+) вместо `colors`.
 * Если id не найден здесь и похож на файл — трактуется как картиночная рамка
 * (`/customization/frames/{id}.webp`).
 */
export type FrameKind = "solid" | "gradient" | "glow" | "glass" | "image";

export type FramePreset = {
  id: string;
  /** Человекочитаемое имя (для превью/доков). */
  name: string;
  kind: FrameKind;
  /** Толщина кольца рамки в px (паддинг вокруг composite). */
  width: number;
  /** Палитра CSS-цветов для solid/gradient/glow. */
  colors: string[];
  /** true → рамка использует кастомный `frame_color` (Voople+), а не `colors`. */
  usesCustomColor?: boolean;
  /** Премиум-пресет (доступен только из магазина / по подписке). */
  isPremium?: boolean;
  /** Картиночная рамка: базовое имя ассета в `customization/frames/` (без расширения). */
  imageBase?: string;
  /** @deprecated Старый параметр border-image; новые overlay-рамки его не используют. */
  imageSlice?: number;
};

const PRESETS: Record<string, FramePreset> = {
  // — Бесплатные (доступны всем без покупки) —
  "frame-slate": {
    id: "frame-slate",
    name: "Slate",
    kind: "solid",
    width: 18,
    colors: ["#3b3b46"],
  },
  "frame-glass": {
    id: "frame-glass",
    name: "Стекло",
    kind: "glass",
    width: 18,
    colors: ["rgba(255,255,255,0.10)"],
  },

  // — Кастомный цвет (Voople+): цвет берётся из frame_color —
  "frame-custom": {
    id: "frame-custom",
    name: "Свой цвет",
    kind: "solid",
    width: 18,
    colors: ["#7B3AED"],
    usesCustomColor: true,
    isPremium: true,
  },

  // — Премиум-пресеты (магазин) —
  "frame-gold-glow": {
    id: "frame-gold-glow",
    name: "Золотое свечение",
    kind: "glow",
    width: 18,
    colors: ["#f5c451", "#b8860b"],
    isPremium: true,
  },
  "frame-aurora": {
    id: "frame-aurora",
    name: "Аврора",
    kind: "gradient",
    width: 18,
    colors: ["#7B3AED", "#34d399", "#60a5fa"],
    isPremium: true,
  },
};

export function getFramePreset(id: string | null | undefined): FramePreset | null {
  if (!id) return null;
  return PRESETS[id] ?? null;
}

export function isFramePresetId(id: string | null | undefined): boolean {
  return Boolean(id && id in PRESETS);
}

export const FRAME_PRESETS = PRESETS;
