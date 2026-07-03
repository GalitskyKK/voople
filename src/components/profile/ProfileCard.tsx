import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import {
  ProfileCardHeader,
  profileCardThemeStyle,
} from "./ProfileCardHeader";
import { ProfileCardVideoSections } from "./ProfileCardVideoSections";
import { frameLayerProps } from "./ProfileCardFrame";
import { ProfileBanner } from "./ProfileBanner";
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

function ProfileCardBodyContent({
  profile,
  isOwner = false,
  canFollow = false,
}: Pick<ProfileCardProps, "profile" | "isOwner" | "canFollow">) {
  return (
    <>
      {profile.bio ? (
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
          {profile.bio}
        </p>
      ) : null}
      {isOwner ? null : (
        <div className="mt-4 flex gap-2">
          <ProfileFollowButton username={profile.username} canFollow={canFollow} />
          <ProfileMessageButton username={profile.username} />
        </div>
      )}
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
    </>
  );
}

export function ProfileCard({
  profile,
  isOwner = false,
  canFollow = false,
  className,
}: ProfileCardProps) {
  const { customization } = profile;
  const { flags, assets, cardBaseMode } = customization;
  const hasBannerMedia = flags.hasBannerMedia && assets.bannerMedia.kind !== "none";
  const framed = assets.frame !== null;
  const frame = frameLayerProps(assets.frame);

  // Рамка = matte-подложка (свой фон); иначе фон карточки из темы.
  const articleStyle = framed
    ? ({ "--theme-accent": customization.themeAccent, ...frame.style } as React.CSSProperties)
    : profileCardThemeStyle(customization);

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

  if (hasBannerMedia) {
    return (
      <article
        className={cn(
          "profile-card voople-profile-card profile-card--split relative",
          frame.className,
          className,
        )}
        style={articleStyle}
      >
        {editButton}
        <ProfileCardVideoSections
          media={assets.bannerMedia}
          baseMode={cardBaseMode}
          themePrimary={customization.themePrimary}
          themeAccent={customization.themeAccent}
          header={header}
        >
          {body}
        </ProfileCardVideoSections>
      </article>
    );
  }

  const flatInner = (
    <>
      <div className="relative z-[2] overflow-hidden rounded-t-2xl">
        <ProfileBanner customization={customization} />
      </div>
      <div className="relative z-10">
        {header}
        {body}
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "profile-card voople-profile-card relative",
        framed ? frame.className : "rounded-2xl",
        className,
      )}
      style={articleStyle}
    >
      {editButton}
      {framed ? (
        <div className="profile-card__surface" style={profileCardThemeStyle(customization)}>
          {flatInner}
        </div>
      ) : (
        flatInner
      )}
    </article>
  );
}
