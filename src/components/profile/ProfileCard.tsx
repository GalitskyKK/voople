import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import {
  ProfileCardEffectLayer,
  ProfileCardHeader,
  profileCardThemeStyle,
} from "./ProfileCardHeader";
import { ProfileMeta } from "./ProfileMeta";
import { ProfileReactions } from "./ProfileReactions";
import { ProfileStats } from "./ProfileStats";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { ProfileFollowButton } from "./ProfileFollowButton";
import { ProfileMessageButton } from "./ProfileMessageButton";
import { ProfileStatusSection } from "./ProfileStatusSection";

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
  const { customization } = profile;

  return (
    <article
      className={cn("profile-card voople-profile-card relative rounded-2xl", className)}
      style={profileCardThemeStyle(customization)}
    >
      <ProfileCardEffectLayer customization={customization} />
      <ProfileCardHeader
        userId={profile.id}
        customization={customization}
        displayName={profile.displayName}
        username={profile.username}
        hasVooplePlus={profile.hasVooplePlus}
        subscriptionExpiresAt={profile.subscriptionExpiresAt}
      />
      <div className="relative z-10 px-4 pb-4">
        {profile.bio && <p className="mt-2 text-sm text-white/70">{profile.bio}</p>}
        <div className="mt-4 flex gap-2">
          {isOwner ? (
            <ProfileEditSheet profile={profile} />
          ) : (
            <>
              <ProfileFollowButton username={profile.username} canFollow={canFollow} />
              <ProfileMessageButton username={profile.username} />
            </>
          )}
        </div>
        <div className="mt-4">
          <ProfileMeta
            createdAt={profile.createdAt}
            subscriptionStartedAt={profile.subscriptionStartedAt}
          />
        </div>
        <div className="mt-4">
          <ProfileStatusSection
            username={profile.username}
            initialStatus={profile.status}
            isOwner={isOwner}
          />
        </div>
        <div className="mt-4 space-y-3">
          <ProfileReactions profileUserId={profile.id} canReact={!isOwner} />
          <ProfileStats {...profile.stats} />
        </div>
      </div>
    </article>
  );
}
