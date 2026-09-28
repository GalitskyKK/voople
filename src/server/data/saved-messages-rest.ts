import {
  assertOwnedUploadKey,
  chatAttachmentKindFromKey,
  chatAudioKindFromKey,
  createPresignedGetUrl,
  publicAssetUrl,
} from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ChatMessageAttachment } from "@/types/chat";
import type {
  SavedMessageCursor,
  SavedMessagePage,
  SavedMessageView,
} from "@/types/saved-messages";

const SAVED_MESSAGE_SELECT =
  "id, owner_id, text, media_url, media_title, media_artist, shared_track_id, reply_to_message_id, created_at, edited_at";

type SavedMessageRow = {
  id: string;
  owner_id: string;
  text: string | null;
  media_url: string | null;
  media_title: string | null;
  media_artist: string | null;
  shared_track_id: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  edited_at: string | null;
};

type TrackRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  file_url: string;
  duration_seconds: number | null;
};

async function loadRelatedRows(rows: SavedMessageRow[], ownerId: string) {
  const admin = getAdminClient();
  const pageIds = new Set(rows.map((row) => row.id));
  const replyIds = [...new Set(rows.flatMap((row) =>
    row.reply_to_message_id && !pageIds.has(row.reply_to_message_id)
      ? [row.reply_to_message_id]
      : [],
  ))];
  const trackIds = [...new Set(rows.flatMap((row) => row.shared_track_id ? [row.shared_track_id] : []))];

  const [replyResult, trackResult] = await Promise.all([
    replyIds.length
      ? admin
          .from("saved_messages")
          .select(SAVED_MESSAGE_SELECT)
          .eq("owner_id", ownerId)
          .in("id", replyIds)
      : Promise.resolve({ data: [], error: null }),
    trackIds.length
      ? admin
          .from("playlist_tracks")
          .select("id, user_id, title, artist, file_url, duration_seconds")
          .eq("user_id", ownerId)
          .in("id", trackIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (replyResult.error) throw new Error(replyResult.error.message);
  if (trackResult.error) throw new Error(trackResult.error.message);

  return {
    repliesById: new Map([
      ...rows.map((row) => [row.id, row] as const),
      ...((replyResult.data ?? []) as SavedMessageRow[]).map((row) => [row.id, row] as const),
    ]),
    tracksById: new Map(
      ((trackResult.data ?? []) as TrackRow[]).map((row) => [row.id, row] as const),
    ),
  };
}

async function buildAttachment(
  row: SavedMessageRow,
  ownerId: string,
  tracksById: Map<string, TrackRow>,
): Promise<ChatMessageAttachment | null> {
  if (row.shared_track_id) {
    const track = tracksById.get(row.shared_track_id);
    if (!track) return null;
    return {
      kind: "track",
      ownerId: track.user_id,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        streamUrl: publicAssetUrl(track.file_url) ?? track.file_url,
        durationSeconds: track.duration_seconds,
      },
    };
  }
  if (!row.media_url) return null;

  assertOwnedUploadKey(row.media_url, ownerId, "chat");
  const { downloadUrl: url } = await createPresignedGetUrl({
    key: row.media_url,
    bucket: "private",
  });
  const kind = chatAttachmentKindFromKey(row.media_url);
  if (kind === "image") return { kind, url };
  if (kind === "circle") return { kind, url };
  if (kind !== "audio") return null;

  const fileName = row.media_url.split("/").pop() ?? "audio";
  const fallbackTitle = fileName.replace(/\.[^.]+$/i, "") || "Аудио";
  return {
    kind,
    audioKind:
      chatAudioKindFromKey(row.media_url) === "voice" ||
      row.media_title === "Голосовое сообщение"
        ? "voice"
        : "music",
    url,
    fileName,
    title: row.media_title?.trim() || fallbackTitle,
    artist: row.media_artist?.trim() || "Аудиосообщение",
  };
}

async function hydrateSavedMessages(
  rows: SavedMessageRow[],
  ownerId: string,
): Promise<SavedMessageView[]> {
  const { repliesById, tracksById } = await loadRelatedRows(rows, ownerId);
  return Promise.all(rows.map(async (row) => {
    const reply = row.reply_to_message_id
      ? repliesById.get(row.reply_to_message_id)
      : null;
    return {
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      replyTo: reply ? { id: reply.id, text: reply.text } : null,
      attachment: await buildAttachment(row, ownerId, tracksById),
    };
  }));
}

export async function listSavedMessagesRest(input: {
  ownerId: string;
  cursor?: SavedMessageCursor;
  limit: number;
  query?: string;
}): Promise<SavedMessagePage> {
  const admin = getAdminClient();
  let request = admin
    .from("saved_messages")
    .select(SAVED_MESSAGE_SELECT)
    .eq("owner_id", input.ownerId);
  if (input.cursor) {
    request = request.or(
      `created_at.lt.${input.cursor.createdAt},and(created_at.eq.${input.cursor.createdAt},id.lt.${input.cursor.id})`,
    );
  }
  if (input.query?.trim()) {
    request = request.textSearch("text", input.query.trim(), {
      config: "simple",
      type: "websearch",
    });
  }

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(input.limit + 1);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SavedMessageRow[];
  const hasNextPage = rows.length > input.limit;
  const pageRows = hasNextPage ? rows.slice(0, input.limit) : rows;
  const items = await hydrateSavedMessages(pageRows, input.ownerId);
  const last = pageRows[pageRows.length - 1];
  return {
    items,
    nextCursor: hasNextPage && last
      ? { createdAt: last.created_at, id: last.id }
      : null,
  };
}

export async function createSavedMessageRest(input: {
  ownerId: string;
  messageId: string;
  text: string | null;
  mediaKey: string | null;
  mediaTitle: string | null;
  mediaArtist: string | null;
  sharedTrackId: string | null;
  replyToMessageId: string | null;
}): Promise<SavedMessageView> {
  const admin = getAdminClient();
  if (input.replyToMessageId) {
    const { data: reply, error } = await admin
      .from("saved_messages")
      .select("id")
      .eq("id", input.replyToMessageId)
      .eq("owner_id", input.ownerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reply) throw new Error("Reply target is unavailable");
  }
  if (input.sharedTrackId) {
    const { data: track, error } = await admin
      .from("playlist_tracks")
      .select("id")
      .eq("id", input.sharedTrackId)
      .eq("user_id", input.ownerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!track) throw new Error("Shared track is unavailable");
  }

  const payload = {
    id: input.messageId,
    owner_id: input.ownerId,
    text: input.text,
    media_url: input.mediaKey,
    media_title: input.mediaTitle,
    media_artist: input.mediaArtist,
    shared_track_id: input.sharedTrackId,
    reply_to_message_id: input.replyToMessageId,
  };
  let { data, error } = await admin
    .from("saved_messages")
    .insert(payload)
    .select(SAVED_MESSAGE_SELECT)
    .single();
  if (error?.code === "23505") {
    const existing = await admin
      .from("saved_messages")
      .select(SAVED_MESSAGE_SELECT)
      .eq("id", input.messageId)
      .eq("owner_id", input.ownerId)
      .maybeSingle();
    data = existing.data;
    error = existing.error;
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Saved message is unavailable");
  const [message] = await hydrateSavedMessages([data as SavedMessageRow], input.ownerId);
  return message;
}

export async function editSavedMessageRest(
  messageId: string,
  ownerId: string,
  text: string,
): Promise<SavedMessageView> {
  const admin = getAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("saved_messages")
    .select(SAVED_MESSAGE_SELECT)
    .eq("id", messageId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Saved message is unavailable");
  const current = existing as SavedMessageRow;
  const trimmed = text.trim();
  if (!trimmed && !current.media_url && !current.shared_track_id) {
    throw new Error("Saved message cannot be empty");
  }

  const { data, error } = await admin
    .from("saved_messages")
    .update({ text: trimmed || null, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("owner_id", ownerId)
    .select(SAVED_MESSAGE_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const [message] = await hydrateSavedMessages([data as SavedMessageRow], ownerId);
  return message;
}

export async function deleteSavedMessageRest(messageId: string, ownerId: string) {
  const { data, error } = await getAdminClient()
    .from("saved_messages")
    .delete()
    .eq("id", messageId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Saved message is unavailable");
  return { id: messageId };
}
