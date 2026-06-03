const ALLOWED_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

export function assertAllowedAudioMime(contentType: string) {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_AUDIO_MIME.has(normalized)) {
    throw new Error("Допустимы MP3, M4A, OGG, WAV или WebM");
  }
  return normalized === "audio/mp3" ? "audio/mpeg" : normalized;
}

export function extensionForAudioMime(contentType: string) {
  const normalized = assertAllowedAudioMime(contentType);
  return EXT_BY_MIME[normalized] ?? "mp3";
}
