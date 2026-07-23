import type { PostMediaType } from "./types";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const POST_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function normalizeMime(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function assertAllowedImageMime(contentType: string) {
  const normalized = normalizeMime(contentType);
  if (!IMAGE_MIME.has(normalized)) {
    throw new Error("Допустимы только JPEG, PNG, WebP или GIF");
  }
  return normalized;
}

export function assertAllowedPostMediaMime(contentType: string) {
  const normalized = normalizeMime(contentType);
  if (!IMAGE_MIME.has(normalized) && !POST_VIDEO_MIME.has(normalized)) {
    throw new Error("Допустимы JPEG, PNG, WebP, GIF, MP4 или WebM");
  }
  return normalized;
}

export function extensionForMime(contentType: string) {
  const normalized = assertAllowedImageMime(contentType);
  return EXT_BY_MIME[normalized] ?? "webp";
}

export function extensionForPostMediaMime(contentType: string) {
  const normalized = assertAllowedPostMediaMime(contentType);
  return EXT_BY_MIME[normalized] ?? "webp";
}

export function mediaTypeForMime(contentType: string): PostMediaType {
  const normalized = assertAllowedImageMime(contentType);
  if (normalized === "image/gif") return "gif";
  return "image";
}

export function postMediaTypeForMime(contentType: string): PostMediaType {
  const normalized = assertAllowedPostMediaMime(contentType);
  if (normalized === "image/gif") return "gif";
  if (POST_VIDEO_MIME.has(normalized)) return "video";
  return "image";
}
