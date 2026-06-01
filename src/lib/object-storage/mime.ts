import type { PostMediaType } from "./types";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function assertAllowedImageMime(contentType: string) {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(normalized)) {
    throw new Error("Допустимы только JPEG, PNG, WebP или GIF");
  }
  return normalized;
}

export function extensionForMime(contentType: string) {
  const normalized = assertAllowedImageMime(contentType);
  return EXT_BY_MIME[normalized] ?? "webp";
}

export function mediaTypeForMime(contentType: string): PostMediaType {
  const normalized = assertAllowedImageMime(contentType);
  if (normalized === "image/gif") return "gif";
  return "image";
}
