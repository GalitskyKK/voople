import { getAdminClient } from "@/lib/supabase/admin";
import { mapUserSearchRow, type UserSearchRow } from "@/server/mappers/user-search";
import type { UserSearchHit } from "@/types/search";

const USER_SELECT = "id, username, display_name, bio, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)";

export async function getTopUsersRest(viewerId?: string | null, limit = 6): Promise<UserSearchHit[]> {
  const admin = getAdminClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString();
  const { data: views, error: viewsError } = await admin
    .from("profile_views")
    .select("profile_user_id")
    .gte("viewed_at", since)
    .limit(2_000);
  if (viewsError) throw new Error(viewsError.message);
  const counts = new Map<string, number>();
  for (const view of views ?? []) {
    const id = view.profile_user_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const rankedIds = [...counts]
    .filter(([id]) => id !== viewerId)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([id]) => id);
  let query = admin.from("users").select(USER_SELECT);
  if (viewerId) query = query.neq("id", viewerId);
  const { data, error } = rankedIds.length
    ? await query.in("id", rankedIds)
    : await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const users = (data ?? []).map((row) => mapUserSearchRow(row as unknown as UserSearchRow));
  if (!rankedIds.length) return users;
  const rank = new Map(rankedIds.map((id, index) => [id, index]));
  return users.sort((left, right) => (rank.get(left.id) ?? limit) - (rank.get(right.id) ?? limit));
}
