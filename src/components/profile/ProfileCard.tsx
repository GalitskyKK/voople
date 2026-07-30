import type { ProfileViewModel } from "@/types/domain";
import { ProfileCardHeader } from "./ProfileCardHeader";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileCardBodyVisual } from "./ProfileCardBodyVisual";
import { ProfileCardVisual } from "./ProfileCardVisual";
import { ProfileReactions } from "./ProfileReactions";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { ProfileFollowButton } from "./ProfileFollowButton";
import { ProfileMessageButton } from "./ProfileMessageButton";
import { ProfileStatusSection } from "./ProfileStatusSection";
import { ProfileShareCardButton } from "./ProfileShareCardButton";

type ProfileCardProps = {
  profile: ProfileViewModel;
  isOwner?: boolean;
  canFollow?: boolean;
  className?: string;
};

function ProfileCardBodyContent({
  profile,
  isOwner = false,
  canFollow = false,
}: Pick<ProfileCardProps, "profile" | "isOwner" | "canFollow">) {
  return (
    <ProfileCardBodyVisual
      profile={profile}
      relationshipActions={
        isOwner || !canFollow ? undefined : (
          <>
          <ProfileFollowButton username={profile.username} canFollow={canFollow} />
          <ProfileMessageButton username={profile.username} size="sm" />
          </>
        )
      }
      status={
        <ProfileStatusSection
          username={profile.username}
          initialStatus={profile.status}
          isOwner={isOwner}
        />
      }
      reactions={
        <ProfileReactions profileUserId={profile.id} canReact={!isOwner} />
      }
      shareAction={isOwner ? <ProfileShareCardButton profile={profile} /> : undefined}
    />
  );
}

export function ProfileCard({
  profile,
  isOwner = false,
  canFollow = false,
  className,
}: ProfileCardProps) {
  const { customization } = profile;

  const editButton = isOwner ? (
    <div className="absolute right-4 top-[230px] z-20">
      <ProfileEditSheet profile={profile} />
    </div>
  ) : null;

  const header = (
    <ProfileCardHeader
      userId={profile.id}
      customization={customization}
      displayName={profile.displayName}
      username={profile.username}
      hasVooplePlus={profile.hasVooplePlus}
      subscriptionExpiresAt={profile.subscriptionExpiresAt}
      showBanner={false}
    />
  );

  const body = (
    <div className="relative px-4 pb-4">
      <ProfileCardBodyContent profile={profile} isOwner={isOwner} canFollow={canFollow} />
    </div>
  );

  return (
    <ProfileCardVisual
      customization={customization}
      header={header}
      body={body}
      banner={
        <ProfileBanner
          customization={customization}
          className="h-[var(--profile-banner-height)] aspect-auto"
        />
      }
      editAction={editButton}
      className={className}
    />
  );
}
