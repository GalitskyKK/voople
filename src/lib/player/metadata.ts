import { parseTrackFilename, readAudioDurationSeconds } from "@/lib/player/format";

export type TrackMetadataDraft = {
  title: string;
  artist: string;
  durationSeconds: number | null;
};

export async function readTrackMetadata(file: File): Promise<TrackMetadataDraft> {
  const fromFilename = parseTrackFilename(file.name);
  let title = fromFilename.title;
  let artist = fromFilename.artist;
  let durationSeconds: number | null = null;

  try {
    const { parseBlob } = await import("music-metadata");
    const metadata = await parseBlob(file, { duration: true });

    const tagTitle = metadata.common.title?.trim();
    const tagArtist =
      metadata.common.artist?.trim() ||
      metadata.common.artists?.map((a) => a.trim()).filter(Boolean).join(", ");

    if (tagTitle) title = tagTitle;
    if (tagArtist) artist = tagArtist;

    if (!artist.trim()) artist = fromFilename.artist || "Неизвестный исполнитель";
    if (!title.trim()) title = fromFilename.title;

    if (metadata.format.duration && Number.isFinite(metadata.format.duration)) {
      durationSeconds = Math.round(metadata.format.duration);
    }
  } catch {
    // Теги могут отсутствовать — остаётся имя файла
  }

  if (durationSeconds == null) {
    durationSeconds = await readAudioDurationSeconds(file);
  }

  return { title, artist, durationSeconds };
}
