import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
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
  resolvePublicMediaKey(input.fileKey, userId, "track");
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
