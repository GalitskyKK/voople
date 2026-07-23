import { DEFAULT_THEME } from "@/lib/constants/theme"
import { customizationAssetPath } from "@/lib/customization/asset-path"
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
import type { NicknameEffect, NicknameFont } from "./types"

/** Raw shape from DB / mock — optional shop-owned fields */
export type CustomizationInput = {
  themePrimary?: string | null
  themeAccent?: string | null
  bannerId?: string | null
  bannerValue?: { color?: string; url?: string; id?: string } | null
  avatarRingId?: string | null
  profileEffectId?: string | null
  profileFrameId?: string | null
  frameColor?: string | null
  cardBaseMode?: string | null
  nicknameColor?: string | null
  nicknameGradient?: boolean | null
  nicknameFont?: string | null
  nicknameEffect?: string | null
  avatarDecorationId?: string | null
  feedCardStyleId?: string | null
  animatedAvatarUrl?: string | null
  animatedAvatarId?: string | null
  profileBackgroundId?: string | null
}

const CARD_BASE_MODES: CardBaseMode[] = ["mirror", "theme", "plain"]
const NICKNAME_FONTS: NicknameFont[] = ["sans", "serif", "rounded", "mono", "display", "soft"]
const NICKNAME_EFFECTS: NicknameEffect[] = ["plain", "gradient", "neon", "highlight", "outline"]

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
      dividerUrl: preset.imageBase
        ? customizationAssetPath("frames", `${preset.imageBase}-divider`)
        : null,
      imageSlice: preset.imageSlice ?? null
    }
  }

  // Неизвестный id, похожий на файл → картиночная рамка из бакета.
  return {
    id: frameId,
    kind: "image",
      width: 18,
    colors: [],
    imageUrl: customizationAssetPath("frames", frameId),
    dividerUrl: customizationAssetPath(
      "frames",
      `${frameId.replace(/\.[a-z0-9]{2,5}$/i, "")}-divider`,
    ),
    imageSlice: null
  }
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
  // Effects are retired. Legacy database values stay intact, but never render.
  const profileEffectId = null
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
    hasDisplayNameStyle: Boolean(
      input.nicknameColor ||
      input.nicknameGradient ||
      (input.nicknameFont && input.nicknameFont !== "sans") ||
      (input.nicknameEffect && input.nicknameEffect !== "plain")
    ),
    hasAvatarRing: Boolean(input.avatarRingId)
  }

  const assets: CustomizationAssets = {
    bannerUrl: hasBanner ? bannerUrl : null,
    bannerMedia,
    profileBackground: backgroundAssets,
    frame,
    profileEffectUrl: null,
    profileEffectPreset: null,
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
    gradient: flags.hasDisplayNameStyle ? Boolean(input.nicknameGradient) : false,
    font: NICKNAME_FONTS.includes(input.nicknameFont as NicknameFont)
      ? input.nicknameFont as NicknameFont
      : "sans",
    effect: NICKNAME_EFFECTS.includes(input.nicknameEffect as NicknameEffect)
      ? input.nicknameEffect as NicknameEffect
      : input.nicknameGradient ? "gradient" : "plain"
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
