import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileBadges } from "./ProfileBadges";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileEffect } from "./ProfileEffect";
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
  const { displayName: nameStyle, flags, assets } = customization;

  const nicknameStyle = nameStyle.gradient
    ? {
        backgroundImage: `linear-gradient(90deg, ${nameStyle.color ?? "#e5e5e5"}, #fff)`,
      }
    : { color: nameStyle.color ?? undefined };

  return (
    <article
      className={cn("profile-card voople-profile-card relative overflow-hidden rounded-2xl", className)}
      style={
        {
          "--theme-primary": customization.themePrimary,
          "--theme-accent": customization.themeAccent,
          background: "var(--theme-primary)",
        } as React.CSSProperties
      }
    >
      <ProfileBanner customization={customization} />
      {flags.hasProfileEffect && assets.profileEffectUrl && (
        <ProfileEffect effectUrl={assets.profileEffectUrl} />
      )}
      <div className="relative z-10 px-4 pb-4">
        <div className="-mt-9 flex items-end justify-between gap-2">
          <ProfileAvatar
            displayName={profile.displayName}
            ring={flags.hasAvatarRing}
            decorationUrl={assets.avatarDecorationUrl}
            animatedAvatarUrl={assets.animatedAvatarUrl}
          />
          <ProfileBadges subscriptionStartedAt={profile.subscriptionStartedAt} />
        </div>
        <h1
          className={cn(
            "mt-3 text-xl font-bold text-white",
            nameStyle.gradient && flags.hasDisplayNameStyle && "bg-clip-text text-transparent",
          )}
          style={flags.hasDisplayNameStyle ? nicknameStyle : undefined}
        >
          {profile.displayName}
        </h1>
        <p className="text-sm text-white/50">@{profile.username}</p>
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
