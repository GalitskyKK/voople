import { getAdminClient } from "@/lib/supabase/admin";
import {
  mapUserSearchRow,
  type UserSearchRow,
} from "@/server/mappers/user-search";
import { getTopPostsRest, searchPostsRest } from "@/server/data/posts-rest";
import { getTopUsersRest } from "@/server/data/search-highlights-rest";
import { listTopPublicGroupsRest } from "@/server/data/chat-discovery-rest";
import {
  getTrendingHashtagsRest,
  searchHashtagsRest,
} from "@/server/data/hashtags-rest";
import type {
  ExploreSearchResult,
  SearchHit,
  UserSearchHit,
  ExploreHighlights,
} from "@/types/search";

export type {
  ExploreSearchResult,
  HashtagSearchHit,
  SearchHit,
  UserSearchHit,
} from "@/types/search";

export async function searchUsers(query: string, limit = 20): Promise<UserSearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const admin = getAdminClient();
  const perQuery = limit;

  const [byUsername, byDisplayName] = await Promise.all([
    admin
      .from("users")
      .select("id, username, display_name, bio, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)")
      .ilike("username", pattern)
      .order("username")
      .limit(perQuery),
    admin
      .from("users")
      .select("id, username, display_name, bio, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)")
      .ilike("display_name", pattern)
      .order("username")
      .limit(perQuery),
  ]);

  if (byUsername.error) throw new Error(byUsername.error.message);
  if (byDisplayName.error) throw new Error(byDisplayName.error.message);

  const seen = new Set<string>();
  const merged: UserSearchHit[] = [];

  for (const row of [...(byUsername.data ?? []), ...(byDisplayName.data ?? [])]) {
    const id = row.id as string;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(
      mapUserSearchRow({
        id,
        username: row.username as string,
        display_name: row.display_name as string,
        bio: (row.bio as string | null) ?? null,
        subscriptions: row.subscriptions as
          | { started_at: string; expires_at: string }
          | { started_at: string; expires_at: string }[]
          | null,
        profile_customization: row.profile_customization as UserSearchRow["profile_customization"],
      }),
    );
    if (merged.length >= limit) break;
  }

  merged.sort((a, b) => a.username.localeCompare(b.username));
  return merged;
}

export async function searchExplore(
  query: string,
  viewerId?: string | null,
  limit = 20,
): Promise<ExploreSearchResult> {
  const q = query.trim();
  if (!q) {
    return { users: [], hashtags: [], posts: [] };
  }

  const perSection = Math.max(3, Math.ceil(limit / 3));
  const userQuery = q.startsWith("#") ? "" : q;

  const [users, hashtags, posts] = await Promise.all([
    userQuery ? searchUsers(userQuery, perSection) : Promise.resolve([]),
    searchHashtagsRest(q, perSection),
    searchPostsRest(q, viewerId, perSection),
  ]);

  return { users, hashtags, posts };
}

export async function getTrendingHashtags(limit = 10) {
  return getTrendingHashtagsRest(limit);
}

export async function getExploreHighlights(viewerId?: string | null): Promise<ExploreHighlights> {
  const [users, posts, communities] = await Promise.all([
    getTopUsersRest(viewerId, 5),
    getTopPostsRest(viewerId, 5),
    listTopPublicGroupsRest(viewerId, 5),
  ]);
  return { users, posts, communities };
}

export async function searchAll(query: string, limit = 20): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const [users, hashtags] = await Promise.all([
    searchUsers(q.replace(/^#/, ""), Math.ceil(limit / 2)),
    searchHashtagsRest(q, Math.ceil(limit / 2)),
  ]);

  return [
    ...hashtags.map((hashtag) => ({ ...hashtag, type: "hashtag" as const })),
    ...users,
  ].slice(0, limit);
}
