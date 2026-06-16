/**
 * Реестр бейджей-достижений (хранятся в user_badges по id). Один источник правды
 * для начисления (сервер) и отображения (профиль). Бейдж = emoji + подпись,
 * без отдельных ассетов — просто и расширяемо.
 */
export type BadgeDef = {
  id: string;
  emoji: string;
  label: string;
  description: string;
};

export const STREAK_MILESTONES = [3, 7, 30, 100] as const;

const BADGES: Record<string, BadgeDef> = {
  "streak-3": { id: "streak-3", emoji: "🔥", label: "3 дня", description: "3 дня подряд в Voople" },
  "streak-7": { id: "streak-7", emoji: "🔥", label: "Неделя", description: "7 дней подряд" },
  "streak-30": { id: "streak-30", emoji: "⚡", label: "Месяц", description: "30 дней подряд" },
  "streak-100": { id: "streak-100", emoji: "👑", label: "100 дней", description: "100 дней подряд" },
};

export function streakBadgeId(days: number): string {
  return `streak-${days}`;
}

export function getBadge(id: string): BadgeDef | null {
  return BADGES[id] ?? null;
}
