import { getAdminClient } from "@/lib/supabase/admin";
import { getPostSelect, mapPostRowsWithReposts } from "@/server/data/post-hydration";
import { loadRepostedPostIdsRest } from "@/server/data/reposts-rest";
import type { PostRow } from "@/server/mappers/profile";
import type { PostViewModel } from "@/types/domain";

export async function getPostByIdRest(
  postId: string,
  viewerId?: string | null,
): Promise<PostViewModel | null> {
  const { data, error } = await getAdminClient()
    .from("posts")
    .select(getPostSelect())
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [post] = await mapPostRowsWithReposts([data as unknown as PostRow], { viewerId });
  if (!post) return null;

  if (!viewerId) return post;

  const repostedIds = await loadRepostedPostIdsRest(viewerId, [postId]);
  return {
    ...post,
    repostedByViewer: repostedIds.has(postId),
  };
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function searchPostsRest(
  query: string,
  viewerId?: string | null,
  limit = 10,
): Promise<PostViewModel[]> {
  const normalized = query.trim().replace(/^#/, "");
  if (normalized.length < 2) return [];

  const pattern = `%${escapeLikePattern(normalized)}%`;
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const admin = getAdminClient();

  const [byText, byRepostComment] = await Promise.all([
    admin
      .from("posts")
      .select(getPostSelect())
      .ilike("text", pattern)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    admin
      .from("posts")
      .select(getPostSelect())
      .ilike("repost_comment", pattern)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
  ]);

  if (byText.error) throw new Error(byText.error.message);
  if (byRepostComment.error) throw new Error(byRepostComment.error.message);

  const rowById = new Map<string, PostRow>();
  const mergedRows = [
    ...((byText.data ?? []) as unknown as PostRow[]),
    ...((byRepostComment.data ?? []) as unknown as PostRow[]),
  ];

  for (const row of mergedRows) {
    rowById.set(row.id, row);
  }

  const rows = [...rowById.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, safeLimit);

  if (rows.length === 0) return [];

  const posts = await mapPostRowsWithReposts(rows, { viewerId });
  if (!viewerId) return posts;

  const repostedIds = await loadRepostedPostIdsRest(
    viewerId,
    posts.map((post) => post.id),
  );

  return posts.map((post) => ({
    ...post,
    repostedByViewer: repostedIds.has(post.id),
  }));
}
