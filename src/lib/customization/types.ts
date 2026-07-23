import type { ResolvedMediaAssets } from "@/lib/customization/profile-background-assets"
import type { FrameKind } from "@/lib/customization/frames-registry"

export type CustomizationFlags = {
  hasCustomTheme: boolean
  /** Заданы цвета темы профиля (градиент карточки), без учёта баннера. */
  hasProfileTheme: boolean
  hasBanner: boolean
  /** У баннера есть медиа (картинка ИЛИ видео) → включается split-layout. */
  hasBannerMedia: boolean
  /** @deprecated отдельный video-слот; используйте hasBannerMedia. */
  hasProfileBackground: boolean
  /** @deprecated эффекты заменены рамкой; данные остаются, рендер выключен. */
  hasProfileEffect: boolean
  /** Задана рамка карточки (пресет frames-registry или картиночная). */
  hasFrame: boolean
  hasAvatarDecoration: boolean
  hasAnimatedAvatar: boolean
  hasFeedCardStyle: boolean
  hasDisplayNameStyle: boolean
  hasAvatarRing: boolean
}

/** Единый медиа-источник баннера: картинка, видео или ничего (плоский цвет). */
export type ResolvedBannerMedia =
  | { kind: "image"; imageUrl: string }
  | ({ kind: "video" } & ResolvedMediaAssets)
  | { kind: "none" }

/** Разрешённая рамка карточки (кольцо-паддинг вокруг баннер+основа). */
export type ResolvedFrame = {
  id: string
  kind: FrameKind
  /** Толщина кольца, px. */
  width: number
  /** Итоговые CSS-цвета (после подстановки кастомного цвета Voople+). */
  colors: string[]
  /** URL цельной прозрачной рамки-overlay, если kind === "image". */
  imageUrl?: string | null
  /** URL отдельного прозрачного разделителя между баннером и body. */
  dividerUrl?: string | null
  /** @deprecated Осталось только для чтения старых preset-конфигов. */
  imageSlice?: number | null
}

/** Режим основы карточки (подложки под контентом). */
export type CardBaseMode = "mirror" | "theme" | "plain"

export type NicknameFont = "sans" | "serif" | "rounded" | "mono" | "display" | "soft"
export type NicknameEffect = "plain" | "gradient" | "neon" | "highlight" | "outline"

export type CustomizationAssets = {
  bannerUrl?: string | null
  /** Единый медиа-источник баннера (image/video/none). */
  bannerMedia: ResolvedBannerMedia
  /** @deprecated используйте bannerMedia (video); оставлено на время миграции. */
  profileBackground?: ResolvedMediaAssets | null
  /** Рамка карточки (замена эффектов). Null — без рамки. */
  frame: ResolvedFrame | null
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
  font: NicknameFont
  effect: NicknameEffect
}

export type ResolvedCustomization = {
  themePrimary: string
  themeAccent: string
  flags: CustomizationFlags
  assets: CustomizationAssets
  displayName: DisplayNameStyle
  avatarRingId?: string | null
  /** Режим основы карточки. */
  cardBaseMode: CardBaseMode
}
