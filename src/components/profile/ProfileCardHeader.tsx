import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileBadges } from "./ProfileBadges";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileEffect } from "./ProfileEffect";

export type ProfileCardHeaderProps = {
  customization: ProfileCustomizationView;
  displayName: string;
  username: string;
  showBadges?: boolean;
  subscriptionStartedAt?: string | null;
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
  showBadges = false,
  subscriptionStartedAt,
  compact = false,
}: ProfileCardHeaderProps) {
  const { displayName: nameStyle, flags, assets } = customization;

  const nicknameStyle = nameStyle.gradient
    ? {
        backgroundImage: `linear-gradient(90deg, ${nameStyle.color ?? "#e5e5e5"}, #fff)`,
      }
    : { color: nameStyle.color ?? undefined };

  return (
    <>
      <div className="relative z-0 overflow-hidden rounded-t-2xl">
        <ProfileBanner customization={customization} />
      </div>

      <div className={cn("relative z-10 px-4", compact ? "pb-4" : "pb-0")}>
        <div className="-mt-9 flex items-end justify-between gap-2">
          <ProfileAvatar
            displayName={displayName}
            ring={flags.hasAvatarRing}
            decorationUrl={assets.avatarDecorationUrl}
            animatedAvatarUrl={assets.animatedAvatarUrl}
          />
          {showBadges ? (
            <ProfileBadges subscriptionStartedAt={subscriptionStartedAt ?? null} />
          ) : (
            <span className="h-[72px] w-0 shrink-0" aria-hidden />
          )}
        </div>
        <h1
          className={cn(
            "mt-3 text-xl font-bold text-white",
            nameStyle.gradient && flags.hasDisplayNameStyle && "bg-clip-text text-transparent",
          )}
          style={flags.hasDisplayNameStyle ? nicknameStyle : undefined}
        >
          {displayName}
        </h1>
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
