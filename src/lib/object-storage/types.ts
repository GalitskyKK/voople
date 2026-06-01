export type UploadPurpose = "post" | "comment" | "avatar";

export type PostMediaType = "image" | "gif" | "meme";

export type PresignedUploadView = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  mediaType: PostMediaType;
  expiresIn: number;
};
