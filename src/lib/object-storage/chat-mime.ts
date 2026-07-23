import { extensionForAudioMime, assertAllowedAudioMime } from "./audio-mime";
import { assertAllowedImageMime, extensionForMime } from "./mime";

export type ChatUploadKind = "image" | "audio" | "circle";
export type ChatAudioKind = "music" | "voice";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function parseChatUploadMime(contentType: string): { kind: ChatUploadKind; extension: string } {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

  if (IMAGE_MIME.has(normalized)) {
    assertAllowedImageMime(normalized);
    return { kind: "image", extension: extensionForMime(normalized) };
  }

  if (normalized === "video/webm") return { kind: "circle", extension: "webm" };
  if (normalized === "video/mp4") return { kind: "circle", extension: "mp4" };

  assertAllowedAudioMime(normalized);
  return { kind: "audio", extension: extensionForAudioMime(normalized) };
}

export function chatAttachmentKindFromKey(key: string): ChatUploadKind {
  if (/\.circle\.(webm|mp4)$/i.test(key)) return "circle";
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  return "audio";
}

export function chatAudioKindFromKey(key: string): ChatAudioKind {
  return /\.voice\.(webm|ogg|mp3|m4a|mp4|wav)$/i.test(key) ? "voice" : "music";
}
