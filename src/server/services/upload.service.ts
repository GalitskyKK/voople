import {
  assertOwnedUploadKey,
  buildUploadKey,
  createPresignedPutUrl,
  extensionForMime,
  getObjectStorageConfig,
  mediaTypeForMime,
  publicAssetUrl,
  UPLOAD_LIMITS,
  type PresignedUploadView,
  type UploadPurpose,
} from "@/lib/object-storage";

export async function createPresignedUpload(input: {
  userId: string;
  purpose: UploadPurpose;
  contentType: string;
  sizeBytes: number;
}): Promise<PresignedUploadView> {
  if (!getObjectStorageConfig()) {
    throw new Error("Загрузка файлов не настроена (S3 env)");
  }

  const limit = UPLOAD_LIMITS[input.purpose];
  if (input.sizeBytes <= 0) throw new Error("Пустой файл");
  if (input.sizeBytes > limit.maxBytes) {
    throw new Error(`Файл больше ${Math.round(limit.maxBytes / (1024 * 1024))} МБ`);
  }

  const extension = extensionForMime(input.contentType);
  const mediaType = mediaTypeForMime(input.contentType);
  const key = buildUploadKey(input.purpose, input.userId, extension);

  const { uploadUrl, expiresIn } = await createPresignedPutUrl({
    key,
    contentType: input.contentType,
  });

  const publicUrl = publicAssetUrl(key);
  if (!publicUrl) throw new Error("Не удалось сформировать URL файла");

  return { key, uploadUrl, publicUrl, mediaType, expiresIn };
}

export function resolvePublicMediaKey(
  key: string | null | undefined,
  userId: string,
  purpose: UploadPurpose,
) {
  if (!key) return null;
  assertOwnedUploadKey(key, userId, purpose);
  return key;
}

export { publicAssetUrl };
