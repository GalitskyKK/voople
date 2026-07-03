import type { ShopItemKind } from "@/lib/shop/catalog";
import { profileBackgroundBaseId } from "@/lib/customization/profile-background-assets";
import { slugifyAssetId } from "@/lib/shop/defaults";

export type AssetPackFileRole = "poster" | "webm" | "mp4";

export type AssetPackFileSpec = {
  role: AssetPackFileRole;
  suffix: string;
  mime: readonly string[];
  label: string;
};

export type AssetPackDefinition = {
  id: "video_media";
  label: string;
  hint: string;
  files: AssetPackFileSpec[];
};

/** Конвенция имён: `{base}-static.jpg`, `{base}-webm.webm`, `{base}-video.mp4`. */
export const VIDEO_MEDIA_PACK: AssetPackDefinition = {
  id: "video_media",
  label: "Video-пакет",
  hint: "Poster (JPEG) + loop WebM + fallback MP4. Базовый id — в equipValue.",
  files: [
    { role: "poster", suffix: "-static.jpg", mime: ["image/jpeg"], label: "Poster (JPEG)" },
    { role: "webm", suffix: "-webm.webm", mime: ["video/webm"], label: "Loop (WebM)" },
    { role: "mp4", suffix: "-video.mp4", mime: ["video/mp4"], label: "Fallback (MP4)" },
  ],
};

const PACK_BY_KIND: Partial<Record<ShopItemKind, AssetPackDefinition>> = {
  profile_background: VIDEO_MEDIA_PACK,
};

export function assetPackForKind(kind: ShopItemKind): AssetPackDefinition | null {
  return PACK_BY_KIND[kind] ?? null;
}

export function usesAssetPack(kind: ShopItemKind): boolean {
  return assetPackForKind(kind) !== null;
}

export function packFileName(base: string, pack: AssetPackDefinition, role: AssetPackFileRole): string {
  const spec = pack.files.find((file) => file.role === role);
  if (!spec) throw new Error(`Unknown pack role: ${role}`);
  return `${base}${spec.suffix}`;
}

export function packFileNames(base: string, pack: AssetPackDefinition): Record<AssetPackFileRole, string> {
  return {
    poster: packFileName(base, pack, "poster"),
    webm: packFileName(base, pack, "webm"),
    mp4: packFileName(base, pack, "mp4"),
  };
}

export function posterAssetIdForBase(base: string, pack: AssetPackDefinition = VIDEO_MEDIA_PACK): string {
  return packFileName(base, pack, "poster");
}

export function inferMediaBaseFromAssetId(assetId: string | null | undefined): string | null {
  if (!assetId) return null;
  const base = profileBackgroundBaseId(assetId);
  if (base.endsWith("-static")) return base.slice(0, -"-static".length);
  if (base.endsWith("-webm")) return base.slice(0, -"-webm".length);
  if (base.endsWith("-video")) return base.slice(0, -"-video".length);
  return base;
}

export function suggestMediaBase(name: string, kind: ShopItemKind): string {
  const slug = slugifyAssetId(name).replace(/\./g, "");
  if (!slug) return kind === "profile_background" ? "background_item" : "asset";
  if (kind === "profile_background") return `background_${slug}`;
  return slug;
}

function mimeFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return null;
}

/** Определяет роль файла в video-пакете по MIME или расширению. */
export function detectPackRoleFromUpload(
  file: Pick<File, "name" | "type">,
  pack: AssetPackDefinition,
): AssetPackFileRole | null {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? mimeFromFileName(file.name);
  if (!mime) return null;

  for (const spec of pack.files) {
    if (spec.mime.includes(mime)) return spec.role;
  }

  return null;
}

export function normalizeMediaBase(raw: string): string {
  return slugifyAssetId(raw).replace(/\./g, "");
}
