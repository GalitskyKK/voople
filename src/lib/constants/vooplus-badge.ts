import { publicAssetUrl } from "@/lib/object-storage/urls";

/** Единый статичный пин. Движение добавляется CSS только при появлении/hover. */
export const VOOPLUS_BADGE_STORAGE_KEY = "pins/vooplus-static.webp";
export const VOOPLUS_BADGE_STATIC_STORAGE_KEY = VOOPLUS_BADGE_STORAGE_KEY;

function defaultCdnBase() {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "";
}

function badgeUrl(storageKey: string, cdnBase = defaultCdnBase()): string {
  const normalizedCdnBase = cdnBase.replace(/\/$/, "");
  return normalizedCdnBase
    ? `${normalizedCdnBase}/${storageKey}`
    : (publicAssetUrl(storageKey) ?? `/${storageKey}`);
}

export function vooplusBadgeUrl(cdnBase = defaultCdnBase()): string {
  return badgeUrl(VOOPLUS_BADGE_STORAGE_KEY, cdnBase);
}

export function vooplusBadgeStaticUrl(cdnBase = defaultCdnBase()): string {
  return badgeUrl(VOOPLUS_BADGE_STATIC_STORAGE_KEY, cdnBase);
}
