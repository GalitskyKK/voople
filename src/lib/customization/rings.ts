/**
 * Реестр стилей колец аватара. Кольцо хранится в `avatar_ring_id` как
 * `equipValue` предмета магазина (например `glow-purple`).
 *
 * Кольца рисуются CSS-классами (см. `.voople-ring*` в globals.css), а не
 * картинками, поэтому добавление нового кольца = запись здесь + класс в CSS.
 * Так и превью магазина, и реальный профиль используют один источник правды.
 */
export type RingStyle = {
  /** CSS-класс, навешиваемый на круг аватара. */
  className: string;
};

/** Базовое кольцо для флага `ring` без конкретного id (акцент темы). */
export const DEFAULT_RING: RingStyle = { className: "voople-ring voople-ring--default" };

const RINGS: Record<string, RingStyle> = {
  "glow-purple": { className: "voople-ring voople-ring--glow-purple" },
};

/**
 * Возвращает стиль кольца по id. Неизвестный id даёт дефолтное кольцо, чтобы
 * купленное, но ещё не описанное кольцо не пропадало визуально.
 */
export function resolveRingStyle(ringId: string | null | undefined): RingStyle | null {
  if (!ringId) return null;
  return RINGS[ringId] ?? DEFAULT_RING;
}
