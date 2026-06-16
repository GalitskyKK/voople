import { DEFAULT_THEME } from "@/lib/constants/theme"
import { customizationAssetPath } from "@/lib/customization/asset-path"
import { isCssEffectId } from "./effects-registry"

import type {
  CustomizationAssets,
  CustomizationFlags,
  DisplayNameStyle,
  ResolvedCustomization
} from "./types"

/** Raw shape from DB / mock — optional shop-owned fields */
export type CustomizationInput = {
  themePrimary?: string | null
  themeAccent?: string | null
  bannerId?: string | null
  bannerValue?: { color?: string; url?: string } | null
  avatarRingId?: string | null
  profileEffectId?: string | null
  nicknameColor?: string | null
  nicknameGradient?: boolean | null
  avatarDecorationId?: string | null
  feedCardStyleId?: string | null
  animatedAvatarUrl?: string | null
  animatedAvatarId?: string | null
}

export function resolveCustomization(input: CustomizationInput = {}): ResolvedCustomization {
  const bannerId = input.bannerId ?? null
  const bannerUrl =
    input.bannerValue?.url ?? (bannerId ? customizationAssetPath("banners", bannerId) : null)
  const hasBanner = Boolean(bannerUrl)
  const hasCustomTheme =
    Boolean(input.themePrimary && input.themePrimary !== DEFAULT_THEME.themePrimary) ||
    Boolean(input.themeAccent && input.themeAccent !== DEFAULT_THEME.themeAccent)
  const profileEffectId = input.profileEffectId ?? null
  const avatarDecorationId = input.avatarDecorationId ?? null
  const feedCardStyleId = input.feedCardStyleId ?? null
  const animatedAvatarId = input.animatedAvatarId ?? null

  const flags: CustomizationFlags = {
    hasCustomTheme: hasCustomTheme || hasBanner,
    hasBanner,
    hasProfileEffect: Boolean(profileEffectId),
    hasAvatarDecoration: Boolean(avatarDecorationId),
    hasAnimatedAvatar: Boolean(input.animatedAvatarUrl || animatedAvatarId),
    hasFeedCardStyle: Boolean(feedCardStyleId),
    hasDisplayNameStyle: Boolean(input.nicknameColor || input.nicknameGradient),
    hasAvatarRing: Boolean(input.avatarRingId)
  }

  const profileEffectIsCss = isCssEffectId(profileEffectId)

  const assets: CustomizationAssets = {
    bannerUrl: hasBanner ? bannerUrl : null,
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
    themePrimary: flags.hasCustomTheme
      ? (input.themePrimary ?? DEFAULT_THEME.themePrimary)
      : DEFAULT_THEME.themePrimary,
    themeAccent: flags.hasCustomTheme
      ? (input.themeAccent ?? DEFAULT_THEME.themeAccent)
      : DEFAULT_THEME.themeAccent,
    flags,
    assets,
    displayName,
    avatarRingId: flags.hasAvatarRing ? input.avatarRingId : null
  }
}
