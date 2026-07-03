const CUSTOMIZATION_PREFIX = "customization/";
const SAFE_SEGMENT = /^[a-z0-9._-]+$/i;

export function buildCustomizationStorageKey(folder: string, fileName: string): string {
  const safeFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  const safeName = fileName.trim().replace(/^\/+/, "");

  if (!safeFolder || !safeName) {
    throw new Error("Укажите папку и имя файла");
  }
  if (safeFolder.includes("..") || safeName.includes("..")) {
    throw new Error("Недопустимый путь");
  }
  if (!SAFE_SEGMENT.test(safeFolder) || !SAFE_SEGMENT.test(safeName)) {
    throw new Error("Папка и имя файла: только буквы, цифры, . _ -");
  }

  return `${CUSTOMIZATION_PREFIX}${safeFolder}/${safeName}`;
}

export function customizationFolderFromKey(key: string): string | null {
  if (!key.startsWith(CUSTOMIZATION_PREFIX)) return null;
  const rest = key.slice(CUSTOMIZATION_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return rest.slice(0, slash);
}

export function customizationFileNameFromKey(key: string): string | null {
  if (!key.startsWith(CUSTOMIZATION_PREFIX)) return null;
  const rest = key.slice(CUSTOMIZATION_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  return rest.slice(slash + 1) || null;
}

/** CDN path без домена — как в `customizationAssetPath`. */
export function customizationPublicPath(folder: string, assetId: string): string {
  return `/customization/${folder}/${assetId}`;
}

export const CUSTOMIZATION_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const CUSTOMIZATION_ALLOWED_MIME = new Set([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

export function extensionForCustomizationMime(contentType: string): string {
  switch (contentType) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      throw new Error("Формат не поддерживается");
  }
}
