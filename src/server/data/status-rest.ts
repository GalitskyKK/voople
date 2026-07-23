import { getAdminClient } from "@/lib/supabase/admin";
import { getPostSelect } from "@/server/data/post-hydration";
import { mapPostRow, mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile";
import { setPostHashtags } from "@/server/services/hashtags.service";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { PostMediaType } from "@/lib/object-storage/types";
import type { PostViewModel, ProfileStatus } from "@/types/domain";

export type StatusInput = {
  moodValue?: number | null;
  thought?: string | null;
  trackId?: string | null;
  trackTitle?: string | null;
  trackArtist?: string | null;
};

export type StatusPublishInput = StatusInput & {
  text?: string;
  mediaKey?: string;
  mediaType?: PostMediaType;
};

function toSnapshot(input: StatusInput) {
  return {
    moodValue: input.moodValue ?? null,
    thought: input.thought?.trim() || null,
    trackId: input.trackId ?? null,
    trackTitle: input.trackTitle?.trim() || null,
    trackArtist: input.trackArtist?.trim() || null,
  };
}

export function mapRowToStatus(row: {
  mood_value?: number | null;
  thought?: string | null;
  track_id?: string | null;
  track_title?: string | null;
  track_artist?: string | null;
}): ProfileStatus {
  return {
    moodValue: row.mood_value ?? null,
    thought: row.thought ?? null,
    trackId: row.track_id ?? null,
    trackTitle: row.track_title ?? null,
    trackArtist: row.track_artist ?? null,
  };
}

export async function saveUserStatusRest(userId: string, input: StatusInput) {
  const admin = getAdminClient();
  const row = {
    user_id: userId,
    mood_value: input.moodValue ?? null,
    thought: input.thought?.trim() || null,
    track_id: input.trackId ?? null,
    track_title: input.trackTitle?.trim() || null,
    track_artist: input.trackArtist?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("user_status").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  return mapRowToStatus(row);
}

export async function publishStatusToFeedRest(
  userId: string,
  input: StatusPublishInput,
): Promise<PostViewModel> {
  const snapshot = toSnapshot(input);
  const text = input.text?.trim() ?? "";
  const mediaKey = input.mediaKey
    ? await resolvePublicMediaKey(input.mediaKey, userId, "post")
    : null;
  if (mediaKey && !input.mediaType) throw new Error("Укажите тип медиа");
  const hasContent =
    snapshot.moodValue != null ||
    Boolean(snapshot.thought) ||
    Boolean(snapshot.trackId) ||
    Boolean(snapshot.trackTitle) ||
    Boolean(snapshot.trackArtist) ||
    Boolean(text) ||
    Boolean(mediaKey);

  if (!hasContent) {
    throw new Error("Заполните хотя бы одно поле состояния");
  }

  await saveUserStatusRest(userId, input);

  const admin = getAdminClient();

  const { error: histErr } = await admin.from("status_history").insert({
    user_id: userId,
    mood_value: snapshot.moodValue,
    thought: snapshot.thought,
    track_title: snapshot.trackTitle,
    track_artist: snapshot.trackArtist,
  });
  if (histErr) throw new Error(histErr.message);

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({
      author_id: userId,
      text: text || null,
      state_snapshot: snapshot,
      media_url: mediaKey,
      media_type: mediaKey ? input.mediaType : null,
    })
    .select(getPostSelect())
    .single();

  if (postErr) throw new Error(postErr.message);
  const postRow = post as unknown as PostRow;
  const tags = await setPostHashtags(
    postRow.id,
    [snapshot.thought, text].filter(Boolean).join(" "),
  );

  const { data: user, error: userErr } = await admin
    .from("users")
    .select("id, username, display_name, profile_customization (*), subscriptions (started_at, expires_at)")
    .eq("id", userId)
    .single();

  if (userErr) throw new Error(userErr.message);

  const author = mapUserToAuthor(user as UserRow);
  return { ...mapPostRow(postRow, author, { likedByViewer: false }), tags };
}
