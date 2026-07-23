/**
 * Реестр бейджей-достижений (хранятся в user_badges по id). Один источник правды
 * для начисления (сервер) и отображения (профиль). `imageKey` указывает на
 * необязательный CDN-ассет; emoji остаётся безопасным fallback.
 */
export type BadgeDef = {
  id: string;
  emoji: string;
  imageKey?: string;
  label: string;
  description: string;
};

export const STREAK_MILESTONES = [30, 100] as const;

export const TEAM_PIN_IDS = ["team-pulse", "team-orbit", "team-forge", "team-echo"] as const;
export type TeamPinId = (typeof TEAM_PIN_IDS)[number];

export const TEAM_PINS: Record<TeamPinId, BadgeDef> = {
  "team-pulse": { id: "team-pulse", emoji: "◉", imageKey: "pins/pulse_pin.webp", label: "Пульс", description: "Замечает настроение людей и задаёт ритм компании" },
  "team-orbit": { id: "team-orbit", emoji: "✦", imageKey: "pins/orbit_pin.webp", label: "Орбита", description: "Собирает вокруг себя людей и новые идеи" },
  "team-forge": { id: "team-forge", emoji: "◆", imageKey: "pins/forge_pin.webp", label: "Кузня", description: "Превращает идеи в вещи, которыми хочется делиться" },
  "team-echo": { id: "team-echo", emoji: "◌", imageKey: "pins/echo_pin.webp", label: "Эхо", description: "Слышит детали и находит точные слова" },
};

const BADGES: Record<string, BadgeDef> = {
  "streak-30": { id: "streak-30", emoji: "⚡", label: "Месяц", description: "30 дней подряд" },
  "streak-100": { id: "streak-100", emoji: "👑", label: "100 дней", description: "100 дней подряд" },
  ...TEAM_PINS,
};

export function streakBadgeId(days: number): string {
  return `streak-${days}`;
}

export function getBadge(id: string): BadgeDef | null {
  return BADGES[id] ?? null;
}
