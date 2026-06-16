import { getAdminClient } from "@/lib/supabase/admin";

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
