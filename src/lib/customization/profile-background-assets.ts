import { customizationAssetPath } from "@/lib/customization/asset-path"

const HAS_FILE_EXT = /\.[a-z0-9]{2,5}$/i

/** `background_blue_flowers` — базовый id в `equip_value`. */
export function profileBackgroundBaseId(backgroundId: string): string {
  return HAS_FILE_EXT.test(backgroundId) ? backgroundId.replace(HAS_FILE_EXT, "") : backgroundId
}

export type ResolvedMediaAssets = {
  posterUrl: string
  webmUrl: string
  mp4Url: string
}

/** @deprecated Используйте {@link ResolvedMediaAssets}. */
export type ResolvedProfileBackgroundAssets = ResolvedMediaAssets

/**
 * Видео-ассет из бакета по конвенции имён:
 * `{base}-static.jpg` (poster), `{base}-webm.webm` (loop), `{base}-video.mp4` (fallback).
 * Переиспользуется и для video-фона, и для video-баннера.
 */
export function resolveMediaAssets(folder: string, base: string): ResolvedMediaAssets {
  return {
    posterUrl: customizationAssetPath(folder, `${base}-static.jpg`) ?? "",
    webmUrl: customizationAssetPath(folder, `${base}-webm.webm`) ?? "",
    mp4Url: customizationAssetPath(folder, `${base}-video.mp4`) ?? ""
  }
}

/** Файлы в бакете `customization/backgrounds/` — тонкая обёртка над {@link resolveMediaAssets}. */
export function resolveProfileBackgroundAssets(
  backgroundId: string
): ResolvedMediaAssets {
  return resolveMediaAssets("backgrounds", profileBackgroundBaseId(backgroundId))
}

export function profileBackgroundPosterPath(backgroundId: string): string | null {
  return resolveProfileBackgroundAssets(backgroundId).posterUrl || null
}
