import type { ProfileViewModel } from "@/types/domain";
import { ProfileBadges } from "./ProfileBadges";
import { ProfileCardView } from "./ProfileCardView";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { ProfileRelationshipActions } from "./ProfileRelationshipActions";
import { ProfileStatusSection } from "./ProfileStatusSection";
import { ProfileShareCardButton } from "./ProfileShareCardButton";
import { PROFILE_STATUS_VISIBLE } from "@/lib/product/profile-beta-surface";

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
        isOwner ? undefined : (
          <ProfileRelationshipActions
            userId={profile.id}
            username={profile.username}
            canFollow={canFollow}
          />
        )
      }
      status={PROFILE_STATUS_VISIBLE ? (
        <ProfileStatusSection
          username={profile.username}
          initialStatus={profile.status}
          isOwner={isOwner}
        />
      ) : undefined}
      shareAction={isOwner ? <ProfileShareCardButton profile={profile} /> : undefined}
      editAction={isOwner ? <ProfileEditSheet profile={profile} /> : undefined}
      className={className}
    />
  );
}
