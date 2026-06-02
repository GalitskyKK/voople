import { getAdminClient } from "@/lib/supabase/admin";

export async function createPostReportRest(
  reporterUserId: string,
  postId: string,
  reason?: string | null,
) {
  const admin = getAdminClient();

  const { data: post, error: postErr } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (postErr) throw new Error(postErr.message);
  if (!post) throw new Error("Пост не найден");
  if (post.author_id === reporterUserId) throw new Error("Нельзя пожаловаться на свой пост");

  const trimmedReason = reason?.trim() || null;

  const { error } = await admin.from("post_reports").insert({
    post_id: postId,
    reporter_user_id: reporterUserId,
    reason: trimmedReason,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Вы уже отправили жалобу на этот пост");
    throw new Error(error.message);
  }

  return { ok: true as const };
}
