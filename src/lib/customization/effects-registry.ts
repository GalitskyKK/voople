/**
 * Реестр code-driven эффектов профиля (в духе Discord) — частицы рисуются CSS,
 * а не картинкой APNG/animated-WebP. Это значит: новый эффект = запись здесь +
 * keyframes в globals.css, без необходимости рисовать тяжёлый анимированный файл.
 *
 * Источник правды и для рендерера на профиле, и для превью в магазине.
 * Эффект из магазина ссылается на пресет по id (`profile_effect_id` = id пресета).
 * Если id не найден здесь — он трактуется как обычный картиночный эффект
 * (`/customization/effects/{id}.webp`).
 */
export type EffectParticleKind = "snow" | "confetti" | "sparkles" | "fireflies";

export type EffectPreset = {
  id: string;
  /** Человекочитаемое имя (для превью/доков). */
  name: string;
  kind: EffectParticleKind;
  /** Базовое число частиц на десктопе; на узких экранах рендерер уменьшает. */
  count: number;
  /** Палитра частиц (CSS-цвета). */
  colors: string[];
  /** Длительность цикла анимации, сек. */
  durationSec: number;
};

const PRESETS: Record<string, EffectPreset> = {
  snow: {
    id: "snow",
    name: "Снег",
    kind: "snow",
    count: 40,
    colors: ["#ffffff", "#e0f2ff", "#cfe8ff"],
    durationSec: 8,
  },
  confetti: {
    id: "confetti",
    name: "Конфетти",
    kind: "confetti",
    count: 36,
    colors: ["#f87171", "#facc15", "#34d399", "#60a5fa", "#c084fc"],
    durationSec: 5,
  },
  sparkles: {
    id: "sparkles",
    name: "Искры",
    kind: "sparkles",
    count: 24,
    colors: ["#fde68a", "#ffffff", "#fcd34d"],
    durationSec: 4,
  },
  fireflies: {
    id: "fireflies",
    name: "Светлячки",
    kind: "fireflies",
    count: 18,
    colors: ["#bef264", "#a3e635", "#fde68a"],
    durationSec: 6,
  },
};

export function getEffectPreset(id: string | null | undefined): EffectPreset | null {
  if (!id) return null;
  return PRESETS[id] ?? null;
}

export function isCssEffectId(id: string | null | undefined): boolean {
  return Boolean(id && id in PRESETS);
}

export const EFFECT_PRESETS = PRESETS;
