/** Ключ в публичном бакете `voople-assets` (CDN: `/pins/vooplus.gif`). */
export const VOOPLUS_BADGE_STORAGE_KEY = "pins/vooplus.gif";

const CDN_BASE = (process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "").replace(/\/$/, "");

export function vooplusBadgeUrl(): string {
  return CDN_BASE
    ? `${CDN_BASE}/${VOOPLUS_BADGE_STORAGE_KEY}`
    : `/${VOOPLUS_BADGE_STORAGE_KEY}`;
}
