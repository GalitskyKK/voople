"use client"

import type { CSSProperties, ReactNode } from "react"

import type { CardBaseMode, ResolvedBannerMedia, ResolvedFrame } from "@/lib/customization/types"
import { cn } from "@/lib/utils"

import { ProfileCardContentBackdrop } from "./ProfileCardContentBackdrop"
import { ProfileCardFrameDivider } from "./ProfileCardFrame"
import { ProfileCardVideo } from "./ProfileCardVideo"
import { ProfileCardVideoScope } from "./ProfileCardVideoScope"

type ProfileCardVideoSectionsProps = {
  media: ResolvedBannerMedia
  header: ReactNode
  children?: ReactNode
  className?: string
  /**
   * Режим основы карточки:
   * - `mirror` (дефолт) — основа дублирует медиа баннера под blur;
   * - `theme` — основа заливается градиентом темы профиля (Voople+);
   * - `plain` — основа = ровная поверхность карточки (Voople+).
   */
  baseMode?: CardBaseMode
  themePrimary?: string
  themeAccent?: string
  frame?: ResolvedFrame | null
}

/**
 * Split-layout: баннер со sharp-медиа → gap → основа с blurred-медиа (mirror) или заливкой
 * (theme/plain) + glass. Медиа = картинка или видео (см. ResolvedBannerMedia).
 */
export function ProfileCardVideoSections({
  media,
  header,
  children,
  className,
  baseMode = "mirror",
  themePrimary,
  themeAccent,
  frame,
}: ProfileCardVideoSectionsProps) {
  const mirrorBase = baseMode === "mirror"

  const baseFillStyle: CSSProperties =
    baseMode === "theme"
      ? {
          background: `linear-gradient(135deg, ${themePrimary ?? "var(--app-surface)"} 0%, ${themeAccent ?? "var(--app-surface)"} 100%)`,
        }
      : { background: "var(--app-surface)" }

  return (
    <ProfileCardVideoScope media={media} className={cn("gap-[var(--profile-section-gap)]", className)}>
      <div className="profile-card__banner">
        <ProfileCardVideo placement="banner" />
      </div>

      <div className="profile-card__body">
        <ProfileCardFrameDivider frame={frame ?? null} />
        {mirrorBase ? (
          <ProfileCardVideo placement="body" />
        ) : (
          <div
            className="absolute inset-0 rounded-[var(--profile-section-radius)]"
            style={baseFillStyle}
            aria-hidden
          />
        )}
        <ProfileCardContentBackdrop />
        <div className="relative z-10">
          {header}
          {children}
        </div>
      </div>
    </ProfileCardVideoScope>
  )
}
