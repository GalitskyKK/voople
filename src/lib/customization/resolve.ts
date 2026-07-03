import { DEFAULT_THEME } from "@/lib/constants/theme"
import { customizationAssetPath } from "@/lib/customization/asset-path"
import { isCssEffectId } from "./effects-registry"
import { getFramePreset } from "./frames-registry"
import {
  resolveProfileBackgroundAssets,
  type ResolvedMediaAssets
} from "@/lib/customization/profile-background-assets"

import type {
  CardBaseMode,
  CustomizationAssets,
  CustomizationFlags,
  DisplayNameStyle,
  ResolvedBannerMedia,
  ResolvedCustomization,
  ResolvedFrame
} from "./types"

/** Raw shape from DB / mock — optional shop-owned fields */
export type CustomizationInput = {
  themePrimary?: string | null
  themeAccent?: string | null
  bannerId?: string | null
  bannerValue?: { color?: string; url?: string } | null
  avatarRingId?: string | null
  profileEffectId?: string | null
  profileFrameId?: string | null
  frameColor?: string | null
  cardBaseMode?: string | null
  nicknameColor?: string | null
  nicknameGradient?: boolean | null
  avatarDecorationId?: string | null
  feedCardStyleId?: string | null
  animatedAvatarUrl?: string | null
  animatedAvatarId?: string | null
  profileBackgroundId?: string | null
}

const HAS_FILE_EXT = /\.[a-z0-9]{2,5}$/i
const CARD_BASE_MODES: CardBaseMode[] = ["mirror", "theme", "plain"]

/**
 * Единый медиа-источник баннера. Переходная логика: video-фон (`profileBackgroundId`)
 * имеет приоритет и сурфейсится как video-баннер; иначе — картинка баннера; иначе — none.
 */
function resolveBannerMedia(
  backgroundAssets: ResolvedMediaAssets | null,
  bannerImageUrl: string | null
): ResolvedBannerMedia {
  if (backgroundAssets) {
    return { kind: "video", ...backgroundAssets }
  }
  if (bannerImageUrl) {
    return { kind: "image", imageUrl: bannerImageUrl }
  }
  return { kind: "none" }
}

/** Рамка карточки из пресета (frames-registry) либо картиночная рамка по id-файлу. */
function resolveFrame(
  frameId: string | null,
  frameColor: string | null
): ResolvedFrame | null {
  if (!frameId) return null

  const preset = getFramePreset(frameId)
  if (preset) {
    const colors =
      preset.usesCustomColor && frameColor ? [frameColor] : preset.colors
    return {
      id: preset.id,
      kind: preset.kind,
      width: preset.width,
      colors,
      imageUrl: preset.imageBase
        ? customizationAssetPath("frames", preset.imageBase)
        : null,
      imageSlice: preset.imageSlice ?? null
    }
  }

  // Неизвестный id, похожий на файл → картиночная рамка из бакета.
  if (HAS_FILE_EXT.test(frameId)) {
    return {
      id: frameId,
      kind: "image",
      width: 10,
      colors: [],
      imageUrl: customizationAssetPath("frames", frameId),
      imageSlice: null
    }
  }

  return null
}

function resolveCardBaseMode(raw: string | null | undefined): CardBaseMode {
  if (raw && (CARD_BASE_MODES as string[]).includes(raw)) {
    return raw as CardBaseMode
  }
  // Дефолт — зеркало баннера. theme/plain включаются только явным выбором (Voople+, Фаза 2).
  return "mirror"
}

export function resolveCustomization(input: CustomizationInput = {}): ResolvedCustomization {
  const bannerId = input.bannerId ?? null
  const bannerUrl =
    input.bannerValue?.url ?? (bannerId ? customizationAssetPath("banners", bannerId) : null)
  const hasBanner = Boolean(bannerUrl)
  const hasProfileTheme =
    Boolean(input.themePrimary && input.themePrimary !== DEFAULT_THEME.themePrimary) ||
    Boolean(input.themeAccent && input.themeAccent !== DEFAULT_THEME.themeAccent)
  const profileEffectId = input.profileEffectId ?? null
  const profileFrameId = input.profileFrameId ?? null
  const frameColor = input.frameColor ?? null
  const avatarDecorationId = input.avatarDecorationId ?? null
  const feedCardStyleId = input.feedCardStyleId ?? null
  const animatedAvatarId = input.animatedAvatarId ?? null
  const profileBackgroundId = input.profileBackgroundId ?? null

  const backgroundAssets = profileBackgroundId
    ? resolveProfileBackgroundAssets(profileBackgroundId)
    : null
  const bannerMedia = resolveBannerMedia(backgroundAssets, hasBanner ? bannerUrl : null)
  const frame = resolveFrame(profileFrameId, frameColor)

  const flags: CustomizationFlags = {
    hasCustomTheme: hasProfileTheme || hasBanner,
    hasProfileTheme,
    hasBanner,
    hasBannerMedia: bannerMedia.kind !== "none",
    hasProfileBackground: Boolean(profileBackgroundId),
    hasProfileEffect: Boolean(profileEffectId),
    hasFrame: frame !== null,
    hasAvatarDecoration: Boolean(avatarDecorationId),
    hasAnimatedAvatar: Boolean(input.animatedAvatarUrl || animatedAvatarId),
    hasFeedCardStyle: Boolean(feedCardStyleId),
    hasDisplayNameStyle: Boolean(input.nicknameColor || input.nicknameGradient),
    hasAvatarRing: Boolean(input.avatarRingId)
  }

  const profileEffectIsCss = isCssEffectId(profileEffectId)

  const assets: CustomizationAssets = {
    bannerUrl: hasBanner ? bannerUrl : null,
    bannerMedia,
    profileBackground: backgroundAssets,
    frame,
    profileEffectUrl:
      flags.hasProfileEffect && !profileEffectIsCss
        ? customizationAssetPath("effects", profileEffectId)
        : null,
    profileEffectPreset:
      flags.hasProfileEffect && profileEffectIsCss ? profileEffectId : null,
    avatarDecorationUrl: flags.hasAvatarDecoration
      ? customizationAssetPath("decorations", avatarDecorationId)
      : null,
    animatedAvatarUrl: flags.hasAnimatedAvatar
      ? (input.animatedAvatarUrl ?? customizationAssetPath("animated", animatedAvatarId))
      : null,
    feedCardBackgroundUrl: flags.hasFeedCardStyle
      ? customizationAssetPath("feed-cards", feedCardStyleId)
      : null
  }

  const displayName: DisplayNameStyle = {
    color: flags.hasDisplayNameStyle ? input.nicknameColor : null,
    gradient: flags.hasDisplayNameStyle ? Boolean(input.nicknameGradient) : false
  }

  return {
    themePrimary: hasProfileTheme
      ? (input.themePrimary ?? DEFAULT_THEME.themePrimary)
      : DEFAULT_THEME.themePrimary,
    themeAccent: hasProfileTheme
      ? (input.themeAccent ?? DEFAULT_THEME.themeAccent)
      : DEFAULT_THEME.themeAccent,
    flags,
    assets,
    displayName,
    avatarRingId: flags.hasAvatarRing ? input.avatarRingId : null,
    cardBaseMode: resolveCardBaseMode(input.cardBaseMode)
  }
}
