import { getAdminClient } from "@/lib/supabase/admin";
import { getPostSelect } from "@/server/data/post-hydration";
import { mapPostRow, mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile";
import { setPostHashtags } from "@/server/services/hashtags.service";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { PostViewModel } from "@/types/domain";
import type { PostMediaType } from "@/lib/object-storage/types";

export { getPostByIdRest as getPostById, searchPostsRest as searchPosts } from "@/server/data/posts-rest";

export async function createPost(
  authorId: string,
  input: { text?: string; mediaKey?: string; mediaType?: PostMediaType },
): Promise<PostViewModel> {
  const trimmed = input.text?.trim() ?? "";
  const mediaKey = input.mediaKey
    ? resolvePublicMediaKey(input.mediaKey, authorId, "post")
    : null;

  if (!trimmed && !mediaKey) throw new Error("Добавьте текст или изображение");
  if (trimmed.length > 280) throw new Error("Максимум 280 символов");
  if (mediaKey && !input.mediaType) throw new Error("Укажите тип медиа");

  const admin = getAdminClient();

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({
      author_id: authorId,
      text: trimmed || null,
      media_url: mediaKey,
      media_type: mediaKey ? input.mediaType : null,
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
