import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";
import { DisplayNameWithPin } from "./DisplayNameWithPin";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileEffect } from "./ProfileEffect";

export type ProfileCardHeaderProps = {
  customization: ProfileCustomizationView;
  displayName: string;
  username: string;
  hasVooplePlus?: boolean;
  subscriptionExpiresAt?: string | null;
  /** Нижний отступ блока имени (превью в магазине). */
  compact?: boolean;
};

/**
 * Верх профиля: баннер, эффект, аватар, имя.
 * Рендерится внутри `<article class="profile-card">` — см. ProfileCard, CustomizationEditor.
 */
export function ProfileCardHeader({
  customization,
  displayName,
  username,
  hasVooplePlus = false,
  subscriptionExpiresAt,
  compact = false,
}: ProfileCardHeaderProps) {
  const { displayName: nameStyle, flags, assets } = customization;

  const nicknameStyle = nameStyle.gradient
    ? {
        backgroundImage: `linear-gradient(90deg, ${nameStyle.color ?? "#e5e5e5"}, #fff)`,
      }
    : { color: nameStyle.color ?? undefined };

  const useGradientName = nameStyle.gradient && flags.hasDisplayNameStyle;

  return (
    <>
      <div className="relative z-0 overflow-hidden rounded-t-2xl">
        <ProfileBanner customization={customization} />
      </div>

      <div className={cn("relative z-10 px-4", compact ? "pb-4" : "pb-0")}>
        <div className="-mt-9 flex items-end justify-between gap-2 overflow-visible">
          <ProfileAvatar
            displayName={displayName}
            ring={flags.hasAvatarRing}
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
            useGradientName ? "bg-clip-text text-transparent" : "text-white",
          )}
          style={useGradientName ? nicknameStyle : undefined}
        >
          {displayName}
        </DisplayNameWithPin>
        <p className="text-sm text-white/50">@{username}</p>
      </div>
    </>
  );
}

/** Оверлей на всю карточку; родитель `<article>` должен быть `position: relative`. */
export function ProfileCardEffectLayer({ customization }: { customization: ProfileCustomizationView }) {
  const { flags, assets } = customization;
  if (!flags.hasProfileEffect || !assets.profileEffectUrl) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-2xl"
      aria-hidden
    >
      <ProfileEffect effectUrl={assets.profileEffectUrl} />
    </div>
  );
}

export function profileCardThemeStyle(customization: ProfileCustomizationView): CSSProperties {
  return {
    "--theme-primary": customization.themePrimary,
    "--theme-accent": customization.themeAccent,
    background: "var(--theme-primary)",
  } as React.CSSProperties;
}
