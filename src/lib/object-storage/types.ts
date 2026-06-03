export type UploadPurpose = "post" | "comment" | "avatar" | "banner" | "track";

export type PostMediaType = "image" | "gif" | "meme";

export type PresignedUploadView = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  mediaType: PostMediaType | null;
  expiresIn: number;
};
