import { getObjectStorageConfig } from "./config";

const PUBLIC_CDN_BASE = (process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "").replace(/\/$/, "");

/** Turn storage key into browser URL (CDN in prod). */
export function publicAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  const normalizedKey = key.replace(/^\//, "");

  // This helper is also used in client components. S3 credentials are never
  // available in the browser, so the public CDN must be resolved before the
  // server-only storage config.
  if (PUBLIC_CDN_BASE) {
    return `${PUBLIC_CDN_BASE}/${normalizedKey}`;
  }

  const config = getObjectStorageConfig();

  if (config?.cdnBase) {
    return `${config.cdnBase}/${normalizedKey}`;
  }

  return `/${normalizedKey}`;
}
