import { getAdminClient } from "@/lib/supabase/admin";
import { getPostSelect, mapPostRowsWithReposts } from "@/server/data/post-hydration";
import type { PostRow } from "@/server/mappers/profile";
import { POST_EDIT_WINDOW_MS } from "@/lib/posts/edit-window";
import { setPostHashtags } from "@/server/services/hashtags.service";
import type { PostViewModel } from "@/types/domain";

export async function updatePostTextRest(
  userId: string,
  postId: string,
  text: string,
): Promise<PostViewModel> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Текст не может быть пустым");
  if (trimmed.length > 280) throw new Error("Максимум 280 символов");

  const admin = getAdminClient();
  const { data: row, error: fetchErr } = await admin
    .from("posts")
    .select("id, author_id, created_at, state_snapshot, is_repost, original_post_id, repost_comment, text")
    .eq("id", postId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Пост не найден");
  if (row.author_id !== userId) throw new Error("Нет прав на редактирование");

  const createdAt = new Date(row.created_at as string).getTime();
  if (Number.isNaN(createdAt) || Date.now() - createdAt > POST_EDIT_WINDOW_MS) {
    throw new Error("Редактирование доступно только в первые 24 часа после публикации");
  }

  if (row.state_snapshot && typeof row.state_snapshot === "object") {
    throw new Error("Посты состояния нельзя редактировать");
  }

  const updatePayload: Record<string, string | null> = { text: trimmed };
  if (row.is_repost && row.original_post_id) {
    if (!row.repost_comment) throw new Error("У этого репоста нет текста для редактирования");
    updatePayload.repost_comment = trimmed;
    delete updatePayload.text;
  }

  const { error: updateErr } = await admin.from("posts").update(updatePayload).eq("id", postId);
  if (updateErr) throw new Error(updateErr.message);

  await setPostHashtags(postId, trimmed);

  const { data: hydrated, error: hydrateErr } = await admin
    .from("posts")
    .select(getPostSelect())
    .eq("id", postId)
    .single();

  if (hydrateErr) throw new Error(hydrateErr.message);

  const [mapped] = await mapPostRowsWithReposts([hydrated as unknown as PostRow], { viewerId: userId });
  if (!mapped) throw new Error("Не удалось загрузить пост");
  return mapped;
}
