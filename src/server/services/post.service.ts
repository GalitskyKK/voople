import { getAdminClient } from "@/lib/supabase/admin";
import { getPostSelect } from "@/server/data/post-hydration";
import { mapPostRow, mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile";
import { setPostHashtags } from "@/server/services/hashtags.service";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { PostViewModel } from "@/types/domain";
import type { PostMediaType } from "@/lib/object-storage/types";
import { getProfileByUsernameRest } from "@/server/data/profile-rest";
import { listUserBadgesRest } from "@/server/data/badges-rest";

export { getPostByIdRest as getPostById, searchPostsRest as searchPosts } from "@/server/data/posts-rest";
export { updatePostTextRest as updatePostText } from "@/server/data/post-update-rest";
export { createPostReportRest as createPostReport } from "@/server/data/post-reports-rest";

export async function createPost(
  authorId: string,
  input: { text?: string; mediaKey?: string; mediaType?: PostMediaType; appearanceScene?: "midnight" | "aurora" | "paper" },
): Promise<PostViewModel> {
  const trimmed = input.text?.trim() ?? "";
  const mediaKey = input.mediaKey
    ? await resolvePublicMediaKey(input.mediaKey, authorId, "post")
    : null;

  if (!trimmed && !mediaKey && !input.appearanceScene) throw new Error("Добавьте текст, медиа или образ профиля");
  if (trimmed.length > 280) throw new Error("Максимум 280 символов");
  if (mediaKey && !input.mediaType) throw new Error("Укажите тип медиа");

  const admin = getAdminClient();

  let appearanceSnapshot: {
    kind: "appearance";
    scene: "midnight" | "aurora" | "paper";
    status: NonNullable<Awaited<ReturnType<typeof getProfileByUsernameRest>>>["status"];
    customization: NonNullable<Awaited<ReturnType<typeof getProfileByUsernameRest>>>["customization"];
    badgeIds: string[];
  } | null = null;
  if (input.appearanceScene) {
    const { data: owner, error: ownerError } = await admin
      .from("users")
      .select("username")
      .eq("id", authorId)
      .single();
    if (ownerError) throw new Error(ownerError.message);
    const profile = await getProfileByUsernameRest(owner.username as string);
    if (!profile) throw new Error("Профиль не найден");
    const badgeIds = await listUserBadgesRest(authorId);
    // Appearance posts are historical snapshots: changing the equipped frame,
    // banner or decoration must not rewrite previously published moments.
    appearanceSnapshot = {
      kind: "appearance",
      scene: input.appearanceScene,
      status: profile.status,
      customization: profile.customization,
      badgeIds,
    };
  }

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({
      author_id: authorId,
      text: trimmed || null,
      media_url: mediaKey,
      media_type: mediaKey ? input.mediaType : null,
      state_snapshot: appearanceSnapshot,
    })
    .select(getPostSelect())
    .single();

  if (postErr) throw new Error(postErr.message);
  const postRow = post as unknown as PostRow;
  const tags = trimmed ? await setPostHashtags(postRow.id, trimmed) : [];

  const { data: user, error: userErr } = await admin
    .from("users")
    .select("id, username, display_name, profile_customization (*)")
    .eq("id", authorId)
    .single();

  if (userErr) throw new Error(userErr.message);

  const author = mapUserToAuthor(user as UserRow);
  return { ...mapPostRow(postRow, author), tags };
}

/** @deprecated use createPost */
export async function createTextPost(authorId: string, text: string) {
  return createPost(authorId, { text });
}
