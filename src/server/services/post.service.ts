import { getAdminClient } from "@/lib/supabase/admin";
import { getPostSelect } from "@/server/data/post-hydration";
import { mapPostRow, mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile";
import { setPostHashtags } from "@/server/services/hashtags.service";
import {
  resolvePostMediaKey,
  resolvePublicMediaKey,
} from "@/server/services/upload.service";
import type { PostViewModel } from "@/types/domain";
import { publicAssetUrl } from "@/lib/object-storage";
import type { PostMediaType } from "@/lib/object-storage/types";
import { getProfileByUsernameRest } from "@/server/data/profile-rest";
import { listUserBadgesRest } from "@/server/data/badges-rest";
import { hasActiveSubscriptionRest } from "@/server/data/subscription-rest";
import { assertPostMediaCount, assertPostMediaSizes } from "@/lib/post-media";

type PostMediaInput = {
  mediaKey: string;
  mediaType: Exclude<PostMediaType, "circle">;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export { getPostByIdRest as getPostById, searchPostsRest as searchPosts } from "@/server/data/posts-rest";
export { updatePostTextRest as updatePostText } from "@/server/data/post-update-rest";
export { deletePostRest as deletePost } from "@/server/data/post-delete-rest";
export { createPostReportRest as createPostReport } from "@/server/data/post-reports-rest";

export async function createPost(
  authorId: string,
  input: { text?: string; mediaKey?: string; mediaType?: PostMediaType; media?: PostMediaInput[]; appearanceScene?: "midnight" | "aurora" | "paper" },
): Promise<PostViewModel> {
  const trimmed = input.text?.trim() ?? "";
  const requestedMedia = input.media ?? [];
  assertPostMediaCount(requestedMedia.length);
  if (requestedMedia.length > 0 && (input.mediaKey || input.mediaType === "circle")) {
    throw new Error("Кружок и галерею нужно публиковать отдельно");
  }
  const resolvedMedia = await Promise.all(
    requestedMedia.map(async (item) => {
      const resolved = await resolvePostMediaKey(item.mediaKey, authorId);
      if (resolved.mediaType !== item.mediaType) throw new Error("Тип вложения не совпадает с файлом");
      return { ...item, ...resolved, mediaType: resolved.mediaType as Exclude<PostMediaType, "circle"> };
    }),
  );
  const hasPlus = resolvedMedia.length > 0
    ? await hasActiveSubscriptionRest(authorId)
    : false;
  assertPostMediaSizes(resolvedMedia.map((item) => item.sizeBytes), hasPlus);
  const mediaKey = resolvedMedia[0]?.key ?? (input.mediaKey
    ? await resolvePublicMediaKey(input.mediaKey, authorId, "post")
    : null);
  const legacyMediaType = resolvedMedia[0]?.mediaType ?? input.mediaType;

  if (!trimmed && !mediaKey && !input.appearanceScene) throw new Error("Добавьте текст, медиа или образ профиля");
  if (trimmed.length > 280) throw new Error("Максимум 280 символов");
  if (mediaKey && !legacyMediaType) throw new Error("Укажите тип медиа");

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
      media_type: mediaKey ? legacyMediaType : null,
      state_snapshot: appearanceSnapshot,
    })
    .select(getPostSelect())
    .single();

  if (postErr) throw new Error(postErr.message);
  const postRow = post as unknown as PostRow;
  if (resolvedMedia.length > 0) {
    const { error: mediaError } = await admin.from("post_media").insert(
      resolvedMedia.map((item, position) => ({
        post_id: postRow.id,
        position,
        url: item.key,
        type: item.mediaType,
        width: item.width ?? null,
        height: item.height ?? null,
        duration_seconds: item.durationSeconds ?? null,
        size_bytes: item.sizeBytes,
      })),
    );
    if (mediaError) {
      await admin.from("posts").delete().eq("id", postRow.id);
      throw new Error(mediaError.message);
    }
  }
  const tags = trimmed ? await setPostHashtags(postRow.id, trimmed) : [];

  const { data: user, error: userErr } = await admin
    .from("users")
    .select("id, username, display_name, profile_customization (*)")
    .eq("id", authorId)
    .single();

  if (userErr) throw new Error(userErr.message);

  const author = mapUserToAuthor(user as UserRow);
  return {
    ...mapPostRow(postRow, author),
    media: resolvedMedia.map((item, position) => ({
      id: `${postRow.id}:${position}`,
      position,
      url: publicAssetUrl(item.key)!,
      type: item.mediaType,
      width: item.width ?? null,
      height: item.height ?? null,
      durationSeconds: item.durationSeconds ?? null,
      sizeBytes: item.sizeBytes,
    })),
    tags,
  };
}

/** @deprecated use createPost */
export async function createTextPost(authorId: string, text: string) {
  return createPost(authorId, { text });
}
