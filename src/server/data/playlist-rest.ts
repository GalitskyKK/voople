import {
  buildUploadKey,
  chatAudioKindFromKey,
  chatAttachmentKindFromKey,
  copyObject,
  publicAssetUrl,
} from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { PlaylistTrackView, UserPlaylistView } from "@/types/playlist";

export type PlaylistTrackRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  file_url: string;
  duration_seconds: number | null;
};

type AnthemRow = { track_id: string };

function mapTrackRow(row: PlaylistTrackRow): PlaylistTrackView {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    streamUrl: publicAssetUrl(row.file_url) ?? row.file_url,
    durationSeconds: row.duration_seconds,
  };
}

export async function listPlaylistForUserRest(userId: string): Promise<UserPlaylistView> {
  const admin = getAdminClient();

  const [tracksRes, anthemRes] = await Promise.all([
    admin
      .from("playlist_tracks")
      .select("id, user_id, title, artist, file_url, duration_seconds")
      .eq("user_id", userId)
      .order("added_at", { ascending: false }),
    admin.from("user_anthem").select("track_id").eq("user_id", userId).maybeSingle(),
  ]);

  if (tracksRes.error) throw new Error(tracksRes.error.message);
  if (anthemRes.error) throw new Error(anthemRes.error.message);

  const anthemTrackId = (anthemRes.data as AnthemRow | null)?.track_id ?? null;

  return {
    userId,
    anthemTrackId,
    tracks: ((tracksRes.data ?? []) as PlaylistTrackRow[]).map(mapTrackRow),
  };
}

export async function insertPlaylistTrackRest(input: {
  userId: string;
  title: string;
  artist: string;
  fileKey: string;
  durationSeconds: number | null;
}): Promise<PlaylistTrackView> {
  const admin = getAdminClient();
  const id = crypto.randomUUID();

  const { data, error } = await admin
    .from("playlist_tracks")
    .insert({
      id,
      user_id: input.userId,
      title: input.title.trim(),
      artist: input.artist.trim(),
      file_url: input.fileKey,
      duration_seconds: input.durationSeconds,
      added_from: "upload",
    })
    .select("id, user_id, title, artist, file_url, duration_seconds")
    .single();

  if (error) throw new Error(error.message);
  return mapTrackRow(data as PlaylistTrackRow);
}

export async function deletePlaylistTrackRest(userId: string, trackId: string) {
  const admin = getAdminClient();

  const { data: track, error: fetchErr } = await admin
    .from("playlist_tracks")
    .select("id, file_url")
    .eq("id", trackId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!track) throw new Error("Трек не найден");

  const { error: anthemErr } = await admin
    .from("user_anthem")
    .delete()
    .eq("user_id", userId)
    .eq("track_id", trackId);
  if (anthemErr) throw new Error(anthemErr.message);

  const { error: statusErr } = await admin
    .from("user_status")
    .update({
      track_id: null,
      track_title: null,
      track_artist: null,
      track_file_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("track_id", trackId);

  if (statusErr) throw new Error(statusErr.message);

  const { error: delErr } = await admin
    .from("playlist_tracks")
    .delete()
    .eq("id", trackId)
    .eq("user_id", userId);

  if (delErr) throw new Error(delErr.message);
}

export async function setUserAnthemRest(userId: string, trackId: string) {
  const admin = getAdminClient();

  const { data: track, error: trackErr } = await admin
    .from("playlist_tracks")
    .select("id, title, artist, file_url")
    .eq("id", trackId)
    .eq("user_id", userId)
    .maybeSingle();

  if (trackErr) throw new Error(trackErr.message);
  if (!track) throw new Error("Трек не найден");

  const row = track as { id: string; title: string; artist: string; file_url: string };

  const { error: anthemErr } = await admin.from("user_anthem").upsert(
    { user_id: userId, track_id: trackId },
    { onConflict: "user_id" },
  );
  if (anthemErr) throw new Error(anthemErr.message);

  const { error: statusErr } = await admin.from("user_status").upsert(
    {
      user_id: userId,
      track_id: trackId,
      track_title: row.title,
      track_artist: row.artist,
      track_file_url: row.file_url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (statusErr) throw new Error(statusErr.message);

  return {
    trackId,
    trackTitle: row.title,
    trackArtist: row.artist,
  };
}

export async function createTrackFromUploadRest(
  userId: string,
  input: {
    fileKey: string;
    title: string;
    artist: string;
    durationSeconds: number | null;
    pinToProfile: boolean;
  },
) {
  await resolvePublicMediaKey(input.fileKey, userId, "track");
  const track = await insertPlaylistTrackRest({
    userId,
    title: input.title,
    artist: input.artist,
    fileKey: input.fileKey,
    durationSeconds: input.durationSeconds,
  });

  if (input.pinToProfile) {
    await setUserAnthemRest(userId, track.id);
  }

  return track;
}

export async function addTrackFromChatRest(
  userId: string,
  sourceTrackId: string,
  metadata?: { title: string; artist: string },
) {
  const admin = getAdminClient();

  const { data: source, error: sourceErr } = await admin
    .from("playlist_tracks")
    .select("id, user_id, title, artist, file_url, duration_seconds")
    .eq("id", sourceTrackId)
    .maybeSingle();

  if (sourceErr) throw new Error(sourceErr.message);
  if (!source) throw new Error("Трек не найден");

  const row = source as PlaylistTrackRow;
  if (row.user_id === userId) {
    return mapTrackRow(row);
  }

  const { data: duplicate, error: dupErr } = await admin
    .from("playlist_tracks")
    .select("id, user_id, title, artist, file_url, duration_seconds")
    .eq("user_id", userId)
    .eq("file_url", row.file_url)
    .maybeSingle();

  if (dupErr) throw new Error(dupErr.message);
  if (duplicate) {
    return mapTrackRow(duplicate as PlaylistTrackRow);
  }

  const id = crypto.randomUUID();
  const { data, error } = await admin
    .from("playlist_tracks")
    .insert({
      id,
      user_id: userId,
      title: metadata?.title.trim() || row.title,
      artist: metadata?.artist.trim() || row.artist,
      file_url: row.file_url,
      duration_seconds: row.duration_seconds,
      added_from: "chat",
    })
    .select("id, user_id, title, artist, file_url, duration_seconds")
    .single();

  if (error) throw new Error(error.message);
  return mapTrackRow(data as PlaylistTrackRow);
}

export async function addTrackFromChatMessageRest(
  recipientUserId: string,
  messageId: string,
  metadata: { title: string; artist: string },
) {
  const admin = getAdminClient();

  const title = metadata.title.trim();
  const artist = metadata.artist.trim();
  if (!title || !artist) throw new Error("Укажите название и исполнителя");

  const { data: message, error: msgErr } = await admin
    .from("messages")
    .select("id, chat_id, sender_id, media_url, media_title, media_artist, shared_track_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr) throw new Error(msgErr.message);
  if (!message) throw new Error("Сообщение не найдено");

  const { data: membership, error: memErr } = await admin
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", message.chat_id as string)
    .eq("user_id", recipientUserId)
    .maybeSingle();

  if (memErr) throw new Error(memErr.message);
  if (!membership) throw new Error("Нет доступа к чату");

  const sharedTrackId = message.shared_track_id as string | null;
  if (sharedTrackId) {
    return addTrackFromChatRest(recipientUserId, sharedTrackId, { title, artist });
  }

  const mediaKey = message.media_url as string | null;
  if (!mediaKey || chatAttachmentKindFromKey(mediaKey) !== "audio") {
    throw new Error("В сообщении нет музыки для плейлиста");
  }
  if (chatAudioKindFromKey(mediaKey) === "voice" || message.media_title === "Голосовое сообщение") {
    throw new Error("Голосовые сообщения нельзя добавлять в плейлист");
  }

  const extension = mediaKey.split(".").pop() ?? "mp3";
  const destKey = buildUploadKey("track", recipientUserId, extension);

  await copyObject({
    sourceBucket: "private",
    sourceKey: mediaKey,
    destBucket: "public",
    destKey,
  });

  return insertPlaylistTrackRest({
    userId: recipientUserId,
    title,
    artist,
    fileKey: destKey,
    durationSeconds: null,
  });
}

export async function getTrackByIdRest(
  trackId: string,
  ownerUserId: string,
): Promise<PlaylistTrackView | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("playlist_tracks")
    .select("id, user_id, title, artist, file_url, duration_seconds")
    .eq("id", trackId)
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapTrackRow(data as PlaylistTrackRow);
}
