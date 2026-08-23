import type { ReactNode } from "react";

import type { ProfileViewModel } from "@/types/domain";
import { ProfileAvatarViewerTrigger } from "./ProfileAvatarViewerTrigger";
import { ProfileAvatarWithPresence } from "./ProfileAvatarWithPresence";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileCardBodyVisual } from "./ProfileCardBodyVisual";
import { ProfileCardIdentityVisual } from "./ProfileCardIdentityVisual";
import { ProfileCardVisual } from "./ProfileCardVisual";

type ProfileCardViewProps = {
  profile: ProfileViewModel;
  badgeUrl?: string;
  badges?: ReactNode;
  relationshipActions?: ReactNode;
  status?: ReactNode;
  reactions?: ReactNode;
  shareAction?: ReactNode;
  editAction?: ReactNode;
  className?: string;
};

/**
 * Canonical profile card shared by Next.js and Tauri.
 * Data access and platform actions are supplied through explicit slots.
 */
export function ProfileCardView({
  profile,
  badgeUrl,
  badges,
  relationshipActions,
  status,
  reactions,
  shareAction,
  editAction,
  className,
}: ProfileCardViewProps) {
  const { customization } = profile;

  return (
    <ProfileCardVisual
      customization={customization}
      className={className}
      banner={
        <ProfileBanner
          customization={customization}
          className="h-[var(--profile-banner-height)] aspect-auto"
        />
      }
      header={
        <ProfileCardIdentityVisual
          customization={customization}
          displayName={profile.displayName}
          username={profile.username}
          hasVooplePlus={profile.hasVooplePlus}
          subscriptionExpiresAt={profile.subscriptionExpiresAt}
          badgeUrl={badgeUrl}
          groupTag={profile.groupTag}
          badges={badges}
          avatar={
            <ProfileAvatarViewerTrigger
              url={customization.assets.animatedAvatarUrl}
              displayName={profile.displayName}
            >
              <ProfileAvatarWithPresence
                userId={profile.id}
                displayName={profile.displayName}
                ring={customization.flags.hasAvatarRing}
                ringId={customization.avatarRingId}
                decorationUrl={customization.assets.avatarDecorationUrl}
                animatedAvatarUrl={customization.assets.animatedAvatarUrl}
              />
            </ProfileAvatarViewerTrigger>
          }
        />
      }
      body={
        <ProfileCardBodyVisual
          profile={profile}
          relationshipActions={relationshipActions}
          status={status}
          reactions={reactions}
          shareAction={shareAction}
        />
      }
      editAction={
        editAction ? (
          <div className="absolute right-4 top-[230px] z-20">{editAction}</div>
        ) : undefined
      }
    />
  );
}
