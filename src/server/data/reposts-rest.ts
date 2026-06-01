import { getAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/server/services/notifications.service";

type RepostRpcResult = string | { toggle_repost?: string | null } | null;

function readRepostId(result: RepostRpcResult) {
  return typeof result === "string" ? result : result?.toggle_repost ?? null;
}

export async function loadRepostedPostIdsRest(viewerId: string, postIds: string[]) {
  if (postIds.length === 0) return new Set<string>();

  const { data, error } = await getAdminClient()
    .from("posts")
    .select("original_post_id")
    .eq("author_id", viewerId)
    .eq("is_repost", true)
    .is("repost_comment", null)
    .in("original_post_id", postIds);

  if (error) throw new Error(error.message);

  return new Set(
    (data ?? [])
      .map((row) => row.original_post_id as string | null)
      .filter((postId): postId is string => Boolean(postId)),
  );
}

export async function toggleRepostRest(postId: string, actorId: string) {
  return createRepostRest(postId, actorId, null);
}

export async function createRepostRest(postId: string, actorId: string, comment: string | null) {
  const trimmedComment = comment?.trim() || null;
  if (trimmedComment && trimmedComment.length > 280) {
    throw new Error("Максимум 280 символов");
  }

  const { data, error } = await getAdminClient().rpc("toggle_repost", {
    p_post_id: postId,
    p_actor_id: actorId,
    p_comment: trimmedComment,
  });

  if (error) throw new Error(error.message);

  const repostId = readRepostId(data as RepostRpcResult);
  const reposted = Boolean(repostId);

  if (reposted) {
    const { data: post, error: postErr } = await getAdminClient()
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .maybeSingle();

    if (postErr) throw new Error(postErr.message);

    if (post?.author_id) {
      void createNotification({
        userId: post.author_id as string,
        type: "repost",
        actorId,
        referenceId: postId,
      }).catch(() => {});
    }
  }

  return { reposted, repostId };
}
