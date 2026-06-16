import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
import { createNotification } from "@/server/services/notifications.service";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";
import { mapUserToAuthor, type UserRow } from "@/server/mappers/profile";
import type { CommentViewModel, PostMediaType } from "@/types/domain";

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  text: string | null;
  media_url?: string | null;
  media_type?: PostMediaType | null;
  created_at: string;
  users?:
    | (Pick<UserRow, "username" | "display_name" | "profile_customization" | "subscriptions">)
    | Array<Pick<UserRow, "username" | "display_name" | "profile_customization" | "subscriptions">>
    | null;
};

type RpcCommentResult = string | { create_post_comment?: string } | null;

function readCommentId(result: RpcCommentResult) {
  return typeof result === "string" ? result : result?.create_post_comment;
}

function mapComment(row: CommentRow, viewerId?: string | null): CommentViewModel {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  const author = user
    ? mapUserToAuthor(user)
    : {
        username: "unknown",
        displayName: "Unknown",
        hasVooplePlus: false,
        customization: toProfileCustomizationView(null),
      };
  return {
    id: row.id,
    postId: row.post_id,
    text: row.text ?? "",
    mediaUrl: publicAssetUrl(row.media_url ?? null),
    mediaType: row.media_type ?? null,
    createdAt: row.created_at,
    canDelete: Boolean(viewerId && viewerId === row.author_id),
    author,
  };
}

export async function listCommentsRest(
  postId: string,
  viewerId?: string | null,
): Promise<CommentViewModel[]> {
  const { data, error } = await getAdminClient()
    .from("post_comments")
    .select(
      "id, post_id, author_id, text, media_url, media_type, created_at, users (username, display_name, profile_customization (*), subscriptions (started_at, expires_at))",
    )
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CommentRow[]).map((row) => mapComment(row, viewerId));
}

export async function createCommentRest(
  postId: string,
  authorId: string,
  input: { text?: string; mediaKey?: string; mediaType?: PostMediaType },
) {
  const trimmed = input.text?.trim() ?? "";
  const mediaKey = input.mediaKey
    ? await resolvePublicMediaKey(input.mediaKey, authorId, "comment")
    : null;

  if (!trimmed && !mediaKey) throw new Error("Введите комментарий или прикрепите изображение");
  if (trimmed.length > 280) throw new Error("Максимум 280 символов");
  if (mediaKey && !input.mediaType) throw new Error("Укажите тип медиа");

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("create_post_comment", {
    p_post_id: postId,
    p_author_id: authorId,
    p_text: trimmed,
    p_media_url: mediaKey,
    p_media_type: mediaKey ? input.mediaType : null,
  });

  if (error) throw new Error(error.message);

  const commentId = readCommentId(data as RpcCommentResult);
  if (!commentId) throw new Error("Не удалось создать комментарий");

  const { data: row, error: rowErr } = await admin
    .from("post_comments")
    .select(
      "id, post_id, author_id, text, media_url, media_type, created_at, users (username, display_name, profile_customization (*), subscriptions (started_at, expires_at))",
    )
    .eq("id", commentId)
    .single();

  if (rowErr) throw new Error(rowErr.message);

  const { data: post, error: postMetaErr } = await admin
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (postMetaErr) throw new Error(postMetaErr.message);

  if (post?.author_id) {
    void createNotification({
      userId: post.author_id as string,
      type: "reply",
      actorId: authorId,
      referenceId: postId,
    }).catch(() => {});
  }

  return mapComment(row as unknown as CommentRow, authorId);
}

export async function deleteCommentRest(commentId: string, actorId: string) {
  const { data, error } = await getAdminClient().rpc("delete_post_comment", {
    p_comment_id: commentId,
    p_actor_id: actorId,
  });

  if (error) throw new Error(error.message);
  return { deleted: Boolean(data) };
}
