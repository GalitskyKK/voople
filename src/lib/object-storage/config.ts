import type { UploadPurpose } from "./types";

export const UPLOAD_LIMITS: Record<UploadPurpose, { maxBytes: number }> = {
  post: { maxBytes: 10 * 1024 * 1024 },
  comment: { maxBytes: 10 * 1024 * 1024 },
  avatar: { maxBytes: 5 * 1024 * 1024 },
  banner: { maxBytes: 5 * 1024 * 1024 },
};

export function getObjectStorageConfig() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "ru-3";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBucket = process.env.S3_BUCKET_PUBLIC ?? "voople-assets";
  const privateBucket = process.env.S3_BUCKET_PRIVATE ?? "voople-uploads";
  const cdnBase = (process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "").replace(/\/$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    publicBucket,
    privateBucket,
    cdnBase,
  };
}
