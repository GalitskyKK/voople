const ENV_PUBLIC_CDN_BASE =
  typeof process === "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "").replace(/\/$/, "");
let runtimePublicCdnBase = "";

export function setPublicAssetBaseUrl(value: string | null | undefined) {
  runtimePublicCdnBase = (value ?? "").replace(/\/+$/, "");
}

/** Turn storage key into browser URL (CDN in prod). */
export function publicAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  const normalizedKey = key.replace(/^\//, "");

  // This helper is also used in client components. S3 credentials are never
  // available in the browser, so the public CDN must be resolved before the
  // server-only storage config.
  const publicCdnBase = runtimePublicCdnBase || ENV_PUBLIC_CDN_BASE;
  if (publicCdnBase) {
    return `${publicCdnBase}/${normalizedKey}`;
  }

  return `/${normalizedKey}`;
}
