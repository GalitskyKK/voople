const HAS_FILE_EXT = /\.[a-z0-9]{2,5}$/i;

const ASSETS_CDN_BASE = (process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "").replace(/\/$/, "");

/** Resolve `/customization/{folder}/{id}.webp` or keep explicit extension (`.apng`, `.png`, …). */
export function customizationAssetPath(folder: string, id: string | null | undefined) {
  if (!id) return null;
  const fileName = HAS_FILE_EXT.test(id) ? id : `${id}.webp`;
  const relativePath = `/customization/${folder}/${fileName}`;
  return ASSETS_CDN_BASE ? `${ASSETS_CDN_BASE}${relativePath}` : relativePath;
}
