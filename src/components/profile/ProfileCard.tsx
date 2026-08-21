import type { ProfileViewModel } from "@/types/domain";
import { ProfileBadges } from "./ProfileBadges";
import { ProfileCardView } from "./ProfileCardView";
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

export function ProfileCard({
  profile,
  isOwner = false,
  canFollow = false,
  className,
}: ProfileCardProps) {
  return (
    <ProfileCardView
      profile={profile}
      badges={<ProfileBadges userId={profile.id} compact className="mt-0 min-w-0 flex-nowrap overflow-hidden" />}
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
      reactions={<ProfileReactions profileUserId={profile.id} canReact={!isOwner} />}
      shareAction={isOwner ? <ProfileShareCardButton profile={profile} /> : undefined}
      editAction={isOwner ? <ProfileEditSheet profile={profile} /> : undefined}
      className={className}
    />
  );
}
