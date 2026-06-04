import { extensionForAudioMime, assertAllowedAudioMime } from "./audio-mime";
import { assertAllowedImageMime, extensionForMime } from "./mime";

export type ChatUploadKind = "image" | "audio";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function parseChatUploadMime(contentType: string): { kind: ChatUploadKind; extension: string } {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

  if (IMAGE_MIME.has(normalized)) {
    assertAllowedImageMime(normalized);
    return { kind: "image", extension: extensionForMime(normalized) };
  }

  assertAllowedAudioMime(normalized);
  return { kind: "audio", extension: extensionForAudioMime(normalized) };
}

export function chatAttachmentKindFromKey(key: string): ChatUploadKind {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  return "audio";
}
