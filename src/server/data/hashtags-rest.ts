import { getAdminClient } from "@/lib/supabase/admin";
import { extractHashtags } from "@/lib/hashtags";
import type { HashtagSearchHit } from "@/types/search";

export async function setPostHashtagsRest(postId: string, text: string) {
  const tags = extractHashtags(text);
  const { error } = await getAdminClient().rpc("set_post_hashtags", {
    p_post_id: postId,
    p_tags: tags,
  });

  if (error) throw new Error(error.message);
  return tags;
}

export async function searchHashtagsRest(query: string, limit = 10): Promise<HashtagSearchHit[]> {
  const normalized = query.trim().replace(/^#/, "").toLowerCase();
  if (!normalized) return [];

  const { data, error } = await getAdminClient()
    .from("hashtags")
    .select("name, post_count")
    .ilike("name", `${normalized.replace(/[%_]/g, "")}%`)
    .order("post_count", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    name: row.name as string,
    postCount: (row.post_count as number | null) ?? 0,
  }));
}

export async function getTrendingHashtagsRest(limit = 10): Promise<HashtagSearchHit[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  const { data, error } = await getAdminClient()
    .from("hashtags")
    .select("name, post_count")
    .gt("post_count", 0)
    .order("post_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(safeLimit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    name: row.name as string,
    postCount: (row.post_count as number | null) ?? 0,
  }));
}
