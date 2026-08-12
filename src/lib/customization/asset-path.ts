import { publicAssetUrl } from "@/lib/object-storage/urls";

const HAS_FILE_EXT = /\.[a-z0-9]{2,5}$/i;

/** Resolve `/customization/{folder}/{id}.webp` or keep explicit extension (`.apng`, `.png`, …). */
export function customizationAssetPath(folder: string, id: string | null | undefined) {
  if (!id) return null;
  const fileName = HAS_FILE_EXT.test(id) ? id : `${id}.webp`;
  const relativePath = `/customization/${folder}/${fileName}`;
  return publicAssetUrl(relativePath) ?? relativePath;
}
