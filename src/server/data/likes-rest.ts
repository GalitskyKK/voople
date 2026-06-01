import { getAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/server/services/notifications.service";

export async function loadLikedPostIdsRest(viewerId: string, postIds: string[]) {
  if (postIds.length === 0) return new Set<string>();

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("likes")
    .select("post_id")
    .eq("user_id", viewerId)
    .in("post_id", postIds);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

export async function toggleLikeRest(postId: string, userId: string) {
  const admin = getAdminClient();

  const { data: post, error: postErr } = await admin
    .from("posts")
    .select("author_id, like_count")
    .eq("id", postId)
    .maybeSingle();

  if (postErr) throw new Error(postErr.message);
  if (!post) throw new Error("Пост не найден");

  const authorId = post.author_id as string;
  let likeCount = (post.like_count as number) ?? 0;

  const { data: existing, error: findErr } = await admin
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error: delErr } = await admin
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);

    likeCount = Math.max(0, likeCount - 1);
    const { error: updErr } = await admin
      .from("posts")
      .update({ like_count: likeCount })
      .eq("id", postId);
    if (updErr) throw new Error(updErr.message);

    return { liked: false, likeCount };
  }

  const { error: insErr } = await admin.from("likes").insert({ post_id: postId, user_id: userId });
  if (insErr) throw new Error(insErr.message);

  likeCount += 1;
  const { error: updErr } = await admin
    .from("posts")
    .update({ like_count: likeCount })
    .eq("id", postId);
  if (updErr) throw new Error(updErr.message);

  void createNotification({
    userId: authorId,
    type: "like",
    actorId: userId,
    referenceId: postId,
  }).catch(() => {});

  return { liked: true, likeCount };
}
