import { getAdminClient } from "@/lib/supabase/admin";
import { TEAM_PIN_IDS, type TeamPinId } from "@/lib/badges/registry";

/** id заработанных бейджей пользователя (новые сначала). Описания — в lib/badges/registry. */
export async function listUserBadgesRest(userId: string): Promise<string[]> {
  const { data, error } = await getAdminClient()
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as { badge_id: string }[]).map((row) => row.badge_id);
}

export async function listUserBadgesByUserIdsRest(
  userIds: string[],
): Promise<Map<string, string[]>> {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return new Map();

  const { data, error } = await getAdminClient()
    .from("user_badges")
    .select("user_id, badge_id, earned_at")
    .in("user_id", uniqueUserIds)
    .order("earned_at", { ascending: false });

  if (error) throw new Error(error.message);

  const badgesByUserId = new Map<string, string[]>();
  for (const row of (data ?? []) as { user_id: string; badge_id: string }[]) {
    const badges = badgesByUserId.get(row.user_id) ?? [];
    badges.push(row.badge_id);
    badgesByUserId.set(row.user_id, badges);
  }
  return badgesByUserId;
}

export async function chooseTeamPinRest(userId: string, answers: TeamPinId[]): Promise<TeamPinId> {
  if (answers.length !== 5 || answers.some((answer) => !TEAM_PIN_IDS.includes(answer))) {
    throw new Error("Ответьте на все вопросы");
  }

  const admin = getAdminClient();
  const { data: existing, error: readError } = await admin
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId)
    .in("badge_id", [...TEAM_PIN_IDS])
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing?.badge_id && TEAM_PIN_IDS.includes(existing.badge_id as TeamPinId)) {
    return existing.badge_id as TeamPinId;
  }

  const score = new Map<TeamPinId, number>(TEAM_PIN_IDS.map((id) => [id, 0]));
  for (const answer of answers) score.set(answer, (score.get(answer) ?? 0) + 1);
  const winner = [...TEAM_PIN_IDS].sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0))[0];

  const { error } = await admin.from("user_badges").insert({ user_id: userId, badge_id: winner });
  if (error) throw new Error(error.message);
  return winner;
}
