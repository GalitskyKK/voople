import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import type { ProfileViewModel } from "@/types/domain";
import { ProfileBannerVisual } from "@/components/profile/ProfileBannerVisual";
import { ProfileCardBodyVisual } from "@/components/profile/ProfileCardBodyVisual";
import { ProfileCardIdentityVisual } from "@/components/profile/ProfileCardIdentityVisual";
import { ProfileCardVisual } from "@/components/profile/ProfileCardVisual";
import { ProfileReactions } from "@/components/profile/ProfileReactions";
import type { DesktopConfig } from "../config";
import type { Session } from "@supabase/supabase-js";
import { DesktopProfileAvatar } from "./DesktopProfileAvatar";
import { DesktopProfileShareButton } from "./DesktopProfileShareButton";
import { DesktopProfileActions } from "./DesktopProfileActions";
import { ProfileStatusSection } from "@/components/profile/ProfileStatusSection";

export function DesktopProfileCard({
  profile,
  config,
  session,
  isOwner,
  onAppearancePublished,
  navigate,
}: {
  profile: ProfileViewModel;
  config: DesktopConfig;
  session: Session;
  isOwner: boolean;
  onAppearancePublished: () => void;
  navigate: (href: string) => void;
}) {
  const { customization } = profile;
  const avatar = (
    <DesktopProfileAvatar
      displayName={profile.displayName}
      customization={customization}
    />
  );

  return (
    <ProfileCardVisual
      customization={customization}
      banner={
        <ProfileBannerVisual
          customization={customization}
          className="h-[var(--profile-banner-height)] aspect-auto"
          renderImage={(url) => (
            <img
              src={url}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
        />
      }
      header={
        <ProfileCardIdentityVisual
          customization={customization}
          displayName={profile.displayName}
          username={profile.username}
          hasVooplePlus={profile.hasVooplePlus}
          subscriptionExpiresAt={profile.subscriptionExpiresAt}
          badgeUrl={vooplusBadgeUrl(config.assetsCdnUrl)}
          avatar={avatar}
        />
      }
      body={
        <ProfileCardBodyVisual
          profile={profile}
          relationshipActions={
            <DesktopProfileActions
              profile={profile}
              config={config}
              session={session}
              isOwner={isOwner}
              navigate={navigate}
              onUpdated={onAppearancePublished}
            />
          }
          status={
            <ProfileStatusSection
              username={profile.username}
              initialStatus={profile.status}
              isOwner={isOwner}
              onPublished={onAppearancePublished}
            />
          }
          reactions={
            <ProfileReactions
              profileUserId={profile.id}
              canReact={!isOwner}
              realtimeEnabled={false}
            />
          }
          shareAction={
            isOwner ? (
              <DesktopProfileShareButton
                profile={profile}
                config={config}
                session={session}
                onPublished={onAppearancePublished}
              />
            ) : undefined
          }
        />
      }
    />
  )
}
