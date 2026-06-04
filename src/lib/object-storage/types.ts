export type UploadPurpose = "post" | "comment" | "avatar" | "banner" | "track" | "chat";

export type StorageBucketKind = "public" | "private";

export type PostMediaType = "image" | "gif" | "meme";

export type PresignedUploadView = {
  key: string;
  uploadUrl: string;
  /** Публичный CDN URL; для chat (private bucket) — null, URL через chat.resolveMedia. */
  publicUrl: string | null;
  mediaType: PostMediaType | null;
  expiresIn: number;
  bucket: StorageBucketKind;
};
