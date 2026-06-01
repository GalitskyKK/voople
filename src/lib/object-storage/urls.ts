import { getObjectStorageConfig } from "./config";

/** Turn storage key into browser URL (CDN in prod). */
export function publicAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  const config = getObjectStorageConfig();
  const normalizedKey = key.replace(/^\//, "");

  if (config?.cdnBase) {
    return `${config.cdnBase}/${normalizedKey}`;
  }

  return `/${normalizedKey}`;
}
