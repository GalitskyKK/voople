import { getAdminClient } from "@/lib/supabase/admin";
import { STREAK_MILESTONES, streakBadgeId } from "@/lib/badges/registry";

export type StreakView = {
  current: number;
  longest: number;
  /** Стрик увеличился именно этим вызовом (первый заход за день). */
  advancedToday: boolean;
  /** id бейджа, заработанного этим вызовом, если веха достигнута. */
  earnedBadgeId: string | null;
};

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

/** Дата в формате YYYY-MM-DD в UTC. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/**
 * Отмечает активность за сегодня и пересчитывает стрик.
 * Идемпотентно в пределах суток: повторные вызовы за тот же день стрик не меняют.
 * `now` инжектируется для тестируемости (по умолчанию — текущее время сервера).
 */
export async function pingStreakRest(userId: string, now = new Date()): Promise<StreakView> {
  const admin = getAdminClient();
  const today = isoDate(now);

  const { data: existing, error: readError } = await admin
    .from("user_streaks")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const row = existing as StreakRow | null;

  // Уже отмечались сегодня — ничего не меняем.
  if (row?.last_active_date === today) {
    return {
      current: row.current_streak,
      longest: row.longest_streak,
      advancedToday: false,
      earnedBadgeId: null,
    };
  }

  const gap = row?.last_active_date ? daysBetween(row.last_active_date, today) : null;
  const current = gap === 1 ? row!.current_streak + 1 : 1;
  const longest = Math.max(current, row?.longest_streak ?? 0);

  const { error: writeError } = await admin.from("user_streaks").upsert(
    {
      user_id: userId,
      current_streak: current,
      longest_streak: longest,
      last_active_date: today,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (writeError) throw new Error(writeError.message);

  const earnedBadgeId = await awardStreakBadge(userId, current);

  return { current, longest, advancedToday: true, earnedBadgeId };
}

export async function getStreakRest(userId: string): Promise<StreakView> {
  const { data, error } = await getAdminClient()
    .from("user_streaks")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const row = data as StreakRow | null;
  return {
    current: row?.current_streak ?? 0,
    longest: row?.longest_streak ?? 0,
    advancedToday: false,
    earnedBadgeId: null,
  };
}

/** Начисляет бейдж за достигнутую веху стрика. Возвращает id, если бейдж новый. */
async function awardStreakBadge(userId: string, streak: number): Promise<string | null> {
  if (!STREAK_MILESTONES.includes(streak as (typeof STREAK_MILESTONES)[number])) {
    return null;
  }

  const badgeId = streakBadgeId(streak);
  const { error } = await getAdminClient()
    .from("user_badges")
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: "user_id,badge_id", ignoreDuplicates: true });

  // Начисление бейджа не должно ронять основной флоу стрика.
  if (error) return null;
  return badgeId;
}
