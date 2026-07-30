"use client";

import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileBadges } from "./ProfileBadges";
import {
  APPEARANCE_SCENES,
  ProfileAppearanceCardVisual,
  type AppearanceProfile,
  type AppearanceSceneId,
} from "./ProfileAppearanceCardVisual";

export { APPEARANCE_SCENES };
export type { AppearanceProfile, AppearanceSceneId };

export function ProfileAppearanceCard({
  profile,
  scene,
  className,
  variant = "share",
}: {
  profile: AppearanceProfile;
  scene: AppearanceSceneId;
  className?: string;
  variant?: "share" | "feed";
}) {
  const { customization } = profile;
  return (
    <ProfileAppearanceCardVisual
      profile={profile}
      scene={scene}
      className={className}
      variant={variant}
      avatar={
        <ProfileAvatar
          displayName={profile.displayName}
          size="md"
          ring={customization.flags.hasAvatarRing}
          ringId={customization.avatarRingId}
          decorationUrl={customization.assets.avatarDecorationUrl}
          animatedAvatarUrl={customization.assets.animatedAvatarUrl}
        />
      }
      badges={
        profile.id ? (
          <ProfileBadges
            userId={profile.id}
            badgeIds={profile.badgeIds}
            className="relative z-20 mt-2"
            compact
          />
        ) : undefined
      }
    />
  );
}
