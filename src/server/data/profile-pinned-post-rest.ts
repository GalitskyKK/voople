import { getAdminClient } from "@/lib/supabase/admin";
import { getPostByIdRest } from "@/server/data/posts-rest";
import type { PostViewModel } from "@/types/domain";

export async function getPinnedPostByUsernameRest(
  username: string,
  viewerId?: string | null,
): Promise<PostViewModel | null> {
  const admin = getAdminClient();
  const { data: owner, error: ownerError } = await admin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (ownerError) throw new Error(ownerError.message);
  if (!owner) return null;

  const { data: pinned, error: pinnedError } = await admin
    .from("profile_pinned_posts")
    .select("post_id")
    .eq("user_id", owner.id)
    .maybeSingle();

  if (pinnedError) throw new Error(pinnedError.message);
  if (!pinned) return null;

  const post = await getPostByIdRest(pinned.post_id as string, viewerId);
  return post?.author.id === owner.id ? post : null;
}

export async function setPinnedPostRest(userId: string, postId: string | null) {
  const admin = getAdminClient();

  if (postId === null) {
    const { error } = await admin
      .from("profile_pinned_posts")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { pinnedPostId: null };
  }

  const { data: post, error: postError } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (postError) throw new Error(postError.message);
  if (!post || post.author_id !== userId) {
    throw new Error("Можно закрепить только собственный пост");
  }

  const { error } = await admin.from("profile_pinned_posts").upsert(
    {
      user_id: userId,
      post_id: postId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);

  return { pinnedPostId: postId };
}
