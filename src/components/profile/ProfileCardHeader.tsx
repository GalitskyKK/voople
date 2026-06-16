import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import type { ProfileCustomizationView } from "@/types/domain"
import { DisplayNameWithPin } from "./DisplayNameWithPin"
import { ProfileAvatarWithPresence } from "./ProfileAvatarWithPresence"
import { ProfileBadges } from "./ProfileBadges"
import { ProfileBanner } from "./ProfileBanner"
import { ProfileEffect } from "./ProfileEffect"
import { CssEffectLayer } from "./effects/CssEffectLayer"

export type ProfileCardHeaderProps = {
  userId?: string
  customization: ProfileCustomizationView
  displayName: string
  username: string
  hasVooplePlus?: boolean
  subscriptionExpiresAt?: string | null
  /** Нижний отступ блока имени (превью в магазине). */
  compact?: boolean
}

/**
 * Верх профиля: баннер, эффект, аватар, имя.
 * Рендерится внутри `<article class="profile-card">` — см. ProfileCard, CustomizationEditor.
 */
export function ProfileCardHeader({
  userId,
  customization,
  displayName,
  username,
  hasVooplePlus = false,
  subscriptionExpiresAt,
  compact = false
}: ProfileCardHeaderProps) {
  const { displayName: nameStyle, flags, assets } = customization

  const nicknameStyle = nameStyle.gradient
    ? {
        backgroundImage: `linear-gradient(90deg, ${nameStyle.color ?? "#e5e5e5"}, #fff)`
      }
    : { color: nameStyle.color ?? undefined }

  const useGradientName = nameStyle.gradient && flags.hasDisplayNameStyle

  return (
    <>
      <div className="relative z-0 overflow-hidden rounded-t-2xl">
        <ProfileBanner customization={customization} />
      </div>

      <div className={cn("relative z-10 px-4", compact ? "pb-4" : "pb-0")}>
        <div className="-mt-9 flex items-end justify-between gap-2 overflow-visible">
          <ProfileAvatarWithPresence
            userId={userId}
            displayName={displayName}
            ring={flags.hasAvatarRing}
            ringId={customization.avatarRingId}
            decorationUrl={assets.avatarDecorationUrl}
            animatedAvatarUrl={assets.animatedAvatarUrl}
          />
          <span className="h-[72px] w-0 shrink-0" aria-hidden />
        </div>
        <DisplayNameWithPin
          as="div"
          hasVooplePlus={hasVooplePlus}
          subscriptionExpiresAt={subscriptionExpiresAt}
          size="md"
          className="mt-3"
          nameClassName={cn(
            "text-xl font-bold",
            useGradientName ? "bg-clip-text text-transparent" : "text-white"
          )}
          style={useGradientName ? nicknameStyle : undefined}>
          {displayName}
        </DisplayNameWithPin>
        <p className="text-sm text-white/50">@{username}</p>
        {userId && !compact && <ProfileBadges userId={userId} />}
      </div>
    </>
  )
}

/**
 * Декоративный эффект поверх всей карточки. Родитель `<article>` должен быть
 * `position: relative`. Слой над контентом (z-[25]) и `pointer-events-none`,
 * поэтому не мешает кликам; читаемость держится за счёт ограничения непрозрачности
 * ассета/частиц (см. docs/customization.md). Эффект бывает двух видов:
 * картиночный (`profileEffectUrl`) или code-driven CSS-пресет (`profileEffectPreset`).
 */
export function ProfileCardEffectLayer({
  customization
}: {
  customization: ProfileCustomizationView
}) {
  const { flags, assets } = customization
  if (!flags.hasProfileEffect) return null
  if (!assets.profileEffectUrl && !assets.profileEffectPreset) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[25] overflow-hidden rounded-2xl"
      aria-hidden>
      {assets.profileEffectPreset ? (
        <CssEffectLayer preset={assets.profileEffectPreset} />
      ) : assets.profileEffectUrl ? (
        <ProfileEffect key={assets.profileEffectUrl} effectUrl={assets.profileEffectUrl} />
      ) : null}
    </div>
  )
}

export function profileCardThemeStyle(customization: ProfileCustomizationView): CSSProperties {
  return {
    "--theme-primary": customization.themePrimary,
    "--theme-accent": customization.themeAccent,
    background: "var(--theme-primary)"
  } as React.CSSProperties
}
