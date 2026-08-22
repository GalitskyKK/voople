import {
  assertOwnedUploadKey,
  assertAllowedImageMime,
  assertAllowedPostMediaMime,
  buildUploadKey,
  bucketForPurpose,
  createPresignedGetUrl,
  createPresignedPutUrl,
  extensionForMime,
  extensionForPostMediaMime,
  getObjectStorageConfig,
  headObject,
  isPrivateChatMediaKey,
  mediaTypeForMime,
  postMediaTypeForMime,
  parseChatUploadMime,
  publicAssetUrl,
  readObjectBytes,
  readObjectPrefix,
  sniffUploadKind,
  UPLOAD_LIMITS,
  type PresignedUploadView,
  type UploadPurpose,
} from "@/lib/object-storage";
import { assertAllowedAudioMime, extensionForAudioMime } from "@/lib/object-storage/audio-mime";
import sharp from "sharp";
import { groupFileLimitBytes } from "@/lib/group-perks";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { getGroupCommunityRest } from "@/server/data/chat-community-rest";
import { hasActiveSubscriptionRest } from "@/server/data/subscription-rest";
import { POST_MEDIA_LIMITS } from "@/lib/post-media";

export const POST_UPLOAD_LIMITS = POST_MEDIA_LIMITS;
const GROUP_EMOJI_MIME = new Set(["image/png", "image/webp", "image/gif"]);

export async function getChatUploadByteLimit(userId: string, chatId?: string) {
  if (!chatId) return UPLOAD_LIMITS.chat.maxBytes;
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group") return UPLOAD_LIMITS.chat.maxBytes;
  const community = await getGroupCommunityRest(membership.accessChatId, userId);
  return groupFileLimitBytes(community.groupLevel, community.largeUploadsEnabled);
}

async function uploadByteLimit(purpose: UploadPurpose, userId: string, chatId?: string) {
  if (purpose === "chat") return getChatUploadByteLimit(userId, chatId);
  if (purpose !== "post") return UPLOAD_LIMITS[purpose].maxBytes;
  return (await hasActiveSubscriptionRest(userId))
    ? POST_UPLOAD_LIMITS.plusFileBytes
    : POST_UPLOAD_LIMITS.freeFileBytes;
}

export async function createPresignedUpload(input: {
  userId: string;
  purpose: UploadPurpose;
  contentType: string;
  sizeBytes: number;
  chatMediaKind?: "voice" | "circle";
  chatId?: string;
}): Promise<PresignedUploadView> {
  if (!getObjectStorageConfig()) {
    throw new Error("Загрузка файлов не настроена (S3 env)");
  }

  const maxBytes = await uploadByteLimit(input.purpose, input.userId, input.chatId);
  if (input.sizeBytes <= 0) throw new Error("Пустой файл");
  if (input.sizeBytes > maxBytes) {
    throw new Error(`Файл больше ${Math.round(maxBytes / (1024 * 1024))} МБ`);
  }

  const chatUpload =
    input.purpose === "chat" ? parseChatUploadMime(input.contentType) : null;
  if (
    input.chatMediaKind === "circle" &&
    chatUpload?.kind !== "circle"
  ) {
    throw new Error("Для кружка требуется видеофайл");
  }
  if (input.purpose === "group-emoji" && !GROUP_EMOJI_MIME.has(input.contentType.toLowerCase())) {
    throw new Error("Для эмодзи допустимы PNG, WebP или GIF");
  }
  if (input.chatMediaKind === "voice" && chatUpload?.kind !== "audio") {
    throw new Error("Для голосового сообщения требуется аудиофайл");
  }

  const extension =
    input.purpose === "track" || input.purpose === "group-sound"
      ? extensionForAudioMime(input.contentType)
      : input.purpose === "chat"
        ? chatUpload!.extension
        : input.purpose === "post"
          ? extensionForPostMediaMime(input.contentType)
          : extensionForMime(input.contentType);
  const mediaType =
    input.purpose === "track" || input.purpose === "group-sound" || input.purpose === "chat"
      ? null
      : input.purpose === "post"
        ? postMediaTypeForMime(input.contentType)
        : mediaTypeForMime(input.contentType);
  const baseKey = buildUploadKey(input.purpose, input.userId, extension);
  const key =
    input.purpose === "chat" && input.chatMediaKind === "circle"
      ? baseKey.replace(/\.([a-z0-9]+)$/i, ".circle.$1")
      : input.purpose === "chat" && input.chatMediaKind === "voice"
        ? baseKey.replace(/\.([a-z0-9]+)$/i, ".voice.$1")
        : baseKey;
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
  options?: { chatId?: string },
) {
  if (!key) return null;
  assertOwnedUploadKey(key, userId, purpose);

  const meta = await headObject({ key, bucket: bucketForPurpose(purpose) });
  if (!meta) throw new Error("Файл не найден в хранилище");

  const maxBytes = await uploadByteLimit(purpose, userId, options?.chatId);
  if (meta.contentLength <= 0) throw new Error("Пустой файл");
  if (meta.contentLength > maxBytes) {
    throw new Error(`Файл больше ${Math.round(maxBytes / (1024 * 1024))} МБ`);
  }

  if (!meta.contentType) throw new Error("У файла отсутствует Content-Type");
  if (purpose === "post") assertAllowedPostMediaMime(meta.contentType);
  else if (purpose === "group-emoji" && !GROUP_EMOJI_MIME.has(meta.contentType.toLowerCase())) {
    throw new Error("Для эмодзи допустимы PNG, WebP или GIF");
  }
  else if (purpose === "chat") {
    const parsed = parseChatUploadMime(meta.contentType);
    const prefix = await readObjectPrefix({ key, bucket: "private" });
    const detected = prefix ? sniffUploadKind(prefix) : null;
    const containerMatches = detected === "container" &&
      (parsed.kind === "audio" || parsed.kind === "circle");
    if (detected !== parsed.kind && !containerMatches) {
      throw new Error("Содержимое файла не соответствует его типу");
    }
  }
  else if (purpose === "track" || purpose === "group-sound") {
    assertAllowedAudioMime(meta.contentType);
    const prefix = await readObjectPrefix({ key, bucket: "public" });
    const detected = prefix ? sniffUploadKind(prefix) : null;
    if (detected !== "audio" && detected !== "container") {
      throw new Error("Содержимое аудиофайла не соответствует его типу");
    }
  }
  else assertAllowedImageMime(meta.contentType);

  return key;
}

export async function isAnimatedPublicImageKey(key: string) {
  const source = await readObjectBytes({ key, bucket: "public" });
  if (!source) throw new Error("Файл не найден в хранилище");
  const metadata = await sharp(source, {
    animated: true,
    limitInputPixels: 16_777_216,
  }).metadata();
  return (metadata.pages ?? 1) > 1;
}

export async function resolvePostMediaKey(key: string, userId: string) {
  const resolvedKey = await resolvePublicMediaKey(key, userId, "post");
  const meta = await headObject({ key: resolvedKey!, bucket: "public" });
  if (!meta?.contentType) throw new Error("Не удалось проверить загруженный файл");
  const mediaType = postMediaTypeForMime(meta.contentType);
  const prefix = await readObjectPrefix({ key: resolvedKey!, bucket: "public" });
  const detectedKind = prefix ? sniffUploadKind(prefix) : null;
  const signatureMatches = mediaType === "video"
    ? detectedKind === "container"
    : detectedKind === "image";
  if (!signatureMatches) {
    throw new Error("Содержимое файла не соответствует заявленному типу");
  }
  return {
    key: resolvedKey!,
    sizeBytes: meta.contentLength,
    mediaType,
  };
}

export { publicAssetUrl };
