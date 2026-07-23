import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import {
  ProfileCardHeader,
  profileCardThemeStyle,
} from "./ProfileCardHeader";
import { ProfileCardVideoSections } from "./ProfileCardVideoSections";
import {
  frameLayerProps,
  ProfileCardFrameDivider,
  ProfileCardFrameOverlay,
} from "./ProfileCardFrame";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileMeta } from "./ProfileMeta";
import { ProfileReactions } from "./ProfileReactions";
import { ProfileStats } from "./ProfileStats";
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
    <>
      {profile.bio ? (
        <p className="mt-2 text-sm leading-5 text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
          {profile.bio}
        </p>
      ) : null}
      {isOwner || !canFollow ? null : (
        <div className="mt-3 flex items-end gap-2">
          <ProfileFollowButton username={profile.username} canFollow={canFollow} />
          <ProfileMessageButton username={profile.username} size="sm" />
        </div>
      )}
      <div className="mt-3">
        <ProfileMeta
          createdAt={profile.createdAt}
          subscriptionStartedAt={profile.subscriptionStartedAt}
        />
      </div>
      <div className="mt-3">
        <ProfileStatusSection
          username={profile.username}
          initialStatus={profile.status}
          isOwner={isOwner}
        />
      </div>
      <div className="mt-3 space-y-2">
        <ProfileReactions profileUserId={profile.id} canReact={!isOwner} />
        {isOwner ? <ProfileShareCardButton profile={profile} /> : null}
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
  const themeStyle = profileCardThemeStyle(customization);
  const articleStyle = framed
    ? ({ "--theme-accent": customization.themeAccent, ...frame.style } as React.CSSProperties)
    : hasBannerMedia
      ? themeStyle
      : ({ ...themeStyle, background: "transparent" } as React.CSSProperties);

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
          frame={assets.frame}
          header={header}
        >
          {body}
          </ProfileCardVideoSections>
          <ProfileCardFrameOverlay frame={assets.frame} />
        </article>
    );
  }

  // Even a default profile has two visible sections: a banner and the body.
  // This keeps the visual hierarchy identical to profiles with media banners.
  const flatInner = (
    <div className="flex flex-col gap-[var(--profile-section-gap)]">
      <div className="relative z-[2] overflow-hidden rounded-[var(--profile-section-radius)]">
        <ProfileBanner customization={customization} className="h-[var(--profile-banner-height)] aspect-auto" />
      </div>
      <div className="profile-card__body" style={themeStyle}>
        <ProfileCardFrameDivider frame={assets.frame} />
        {header}
        {body}
      </div>
    </div>
  );

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
      {flatInner}
      <ProfileCardFrameOverlay frame={assets.frame} />
    </article>
  );
}
