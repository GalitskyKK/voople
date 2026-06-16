import {
  assertOwnedUploadKey,
  buildUploadKey,
  bucketForPurpose,
  createPresignedGetUrl,
  createPresignedPutUrl,
  extensionForMime,
  getObjectStorageConfig,
  headObject,
  isPrivateChatMediaKey,
  mediaTypeForMime,
  parseChatUploadMime,
  publicAssetUrl,
  UPLOAD_LIMITS,
  type PresignedUploadView,
  type UploadPurpose,
} from "@/lib/object-storage";
import { extensionForAudioMime } from "@/lib/object-storage/audio-mime";

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

  const extension =
    input.purpose === "track"
      ? extensionForAudioMime(input.contentType)
      : input.purpose === "chat"
        ? parseChatUploadMime(input.contentType).extension
        : extensionForMime(input.contentType);
  const mediaType =
    input.purpose === "track" || input.purpose === "chat"
      ? null
      : mediaTypeForMime(input.contentType);
  const key = buildUploadKey(input.purpose, input.userId, extension);
  const bucketKind = bucketForPurpose(input.purpose);

  const { uploadUrl, expiresIn } = await createPresignedPutUrl({
    key,
    contentType: input.contentType,
    purpose: input.purpose,
  });

  const publicUrl = bucketKind === "public" ? publicAssetUrl(key) : null;
  if (bucketKind === "public" && !publicUrl) {
    throw new Error("Не удалось сформировать URL файла");
  }

  return { key, uploadUrl, publicUrl, mediaType, expiresIn, bucket: bucketKind };
}

export async function resolveChatMediaUrl(key: string, userId: string) {
  assertOwnedUploadKey(key, userId, "chat");
  if (!isPrivateChatMediaKey(key)) {
    throw new Error("Недопустимый файл чата");
  }
  const { downloadUrl } = await createPresignedGetUrl({ key, bucket: "private" });
  return downloadUrl;
}

/**
 * Проверяет, что presigned-загруженный объект принадлежит пользователю и не
 * превышает лимит для своего назначения. Размер проверяется через HeadObject,
 * потому что presigned PUT не умеет ограничивать размер на стороне S3
 * (клиент мог запросить URL с маленьким sizeBytes, а залить большой файл).
 */
export async function resolvePublicMediaKey(
  key: string | null | undefined,
  userId: string,
  purpose: UploadPurpose,
) {
  if (!key) return null;
  assertOwnedUploadKey(key, userId, purpose);

  const meta = await headObject({ key, bucket: bucketForPurpose(purpose) });
  if (!meta) throw new Error("Файл не найден в хранилище");

  const limit = UPLOAD_LIMITS[purpose];
  if (meta.contentLength <= 0) throw new Error("Пустой файл");
  if (meta.contentLength > limit.maxBytes) {
    throw new Error(`Файл больше ${Math.round(limit.maxBytes / (1024 * 1024))} МБ`);
  }

  return key;
}

export { publicAssetUrl };
