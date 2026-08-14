import type { PostMediaView, PostViewModel } from "@/types/domain";

export const POST_MEDIA_LIMITS = {
  maxItems: 10,
  freeFileBytes: 15 * 1024 * 1024,
  plusFileBytes: 100 * 1024 * 1024,
  freePostBytes: 100 * 1024 * 1024,
  plusPostBytes: 500 * 1024 * 1024,
} as const;

type GalleryPost = Pick<PostViewModel, "id" | "media" | "mediaType" | "mediaUrl">;

export function normalizePostMedia(post: GalleryPost): PostMediaView[] {
  if (post.media?.length) {
    return [...post.media].sort((first, second) => first.position - second.position);
  }
  if (!post.mediaUrl || post.mediaType === "circle") return [];
  return [{
    id: `${post.id}:legacy`,
    position: 0,
    url: post.mediaUrl,
    type: post.mediaType ?? "image",
  }];
}

export function assertPostMediaCount(count: number) {
  if (!Number.isInteger(count) || count < 0 || count > POST_MEDIA_LIMITS.maxItems) {
    throw new Error(`В публикации может быть до ${POST_MEDIA_LIMITS.maxItems} вложений`);
  }
}

export function assertPostMediaSizes(sizes: number[], hasVooplePlus: boolean) {
  assertPostMediaCount(sizes.length);
  const fileLimit = hasVooplePlus
    ? POST_MEDIA_LIMITS.plusFileBytes
    : POST_MEDIA_LIMITS.freeFileBytes;
  const postLimit = hasVooplePlus
    ? POST_MEDIA_LIMITS.plusPostBytes
    : POST_MEDIA_LIMITS.freePostBytes;
  if (sizes.some((size) => !Number.isFinite(size) || size <= 0 || size > fileLimit)) {
    throw new Error(`Один из файлов больше ${Math.round(fileLimit / (1024 * 1024))} МБ`);
  }
  if (sizes.reduce((total, size) => total + size, 0) > postLimit) {
    throw new Error(`Вложения публикации больше ${Math.round(postLimit / (1024 * 1024))} МБ`);
  }
}
