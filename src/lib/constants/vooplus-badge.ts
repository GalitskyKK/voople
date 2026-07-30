/** Ключ в публичном бакете `voople-assets` (CDN: `/pins/vooplus.gif`). */
export const VOOPLUS_BADGE_STORAGE_KEY = "pins/vooplus.gif";

function defaultCdnBase() {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "";
}

export function vooplusBadgeUrl(cdnBase = defaultCdnBase()): string {
  const normalizedCdnBase = cdnBase.replace(/\/$/, "");
  return normalizedCdnBase
    ? `${normalizedCdnBase}/${VOOPLUS_BADGE_STORAGE_KEY}`
    : `/${VOOPLUS_BADGE_STORAGE_KEY}`;
}
