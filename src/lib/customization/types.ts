export type CustomizationFlags = {
  hasCustomTheme: boolean
  /** Заданы цвета темы профиля (градиент карточки), без учёта баннера. */
  hasProfileTheme: boolean
  hasBanner: boolean
  hasProfileEffect: boolean
  hasAvatarDecoration: boolean
  hasAnimatedAvatar: boolean
  hasFeedCardStyle: boolean
  hasDisplayNameStyle: boolean
  hasAvatarRing: boolean
}

export type CustomizationAssets = {
  bannerUrl?: string | null
  /** URL картиночного эффекта (APNG/animated-WebP). Null, если эффект CSS-пресет. */
  profileEffectUrl?: string | null
  /** id CSS-пресета эффекта (см. effects-registry). Null, если эффект картиночный. */
  profileEffectPreset?: string | null
  avatarDecorationUrl?: string | null
  animatedAvatarUrl?: string | null
  feedCardBackgroundUrl?: string | null
}

export type DisplayNameStyle = {
  color?: string | null
  gradient?: boolean
}

export type ResolvedCustomization = {
  themePrimary: string
  themeAccent: string
  flags: CustomizationFlags
  assets: CustomizationAssets
  displayName: DisplayNameStyle
  avatarRingId?: string | null
}
