import type { ProfileCustomizationView } from "@/types/domain"
import { ProfileAvatarWithPresence } from "./ProfileAvatarWithPresence"
import { ProfileBadges } from "./ProfileBadges"
import { ProfileBanner } from "./ProfileBanner"
import { ProfileCardIdentityVisual } from "./ProfileCardIdentityVisual"
import { ProfileEffect } from "./ProfileEffect"
import { CssEffectLayer } from "./effects/CssEffectLayer"
import { ProfileAvatarViewerTrigger } from "./ProfileAvatarViewerTrigger"

export type ProfileCardHeaderProps = {
  userId?: string
  customization: ProfileCustomizationView
  displayName: string
  username: string
  hasVooplePlus?: boolean
  subscriptionExpiresAt?: string | null
  /** Нижний отступ блока имени (превью в магазине). */
  compact?: boolean
  /** Не рендерить баннер (если вынесен выше для z-index). */
  showBanner?: boolean
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
  compact = false,
  showBanner = true
}: ProfileCardHeaderProps) {
  const { flags, assets } = customization

  return (
    <>
      {showBanner ? (
        <div className="relative z-[2] overflow-hidden rounded-t-2xl">
          <ProfileBanner customization={customization} />
        </div>
      ) : null}

      <ProfileCardIdentityVisual
        customization={customization}
        displayName={displayName}
        username={username}
        hasVooplePlus={hasVooplePlus}
        subscriptionExpiresAt={subscriptionExpiresAt}
        compact={compact}
        avatar={
          <ProfileAvatarViewerTrigger
            url={assets.animatedAvatarUrl}
            displayName={displayName}
          >
            <ProfileAvatarWithPresence
              userId={userId}
              displayName={displayName}
              ring={flags.hasAvatarRing}
              ringId={customization.avatarRingId}
              decorationUrl={assets.avatarDecorationUrl}
              animatedAvatarUrl={assets.animatedAvatarUrl}
            />
          </ProfileAvatarViewerTrigger>
        }
        badges={
          userId && !compact ? (
            <ProfileBadges userId={userId} compact className="mt-0 min-w-0 flex-nowrap overflow-hidden" />
          ) : null}
      />
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
