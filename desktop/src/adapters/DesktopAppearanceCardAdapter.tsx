import { ProfileAppearanceCardVisual } from "@/components/profile/ProfileAppearanceCardVisual";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileBadgesView } from "@/components/profile/ProfileBadgesView";
import type { PostViewModel, ProfileCustomizationView } from "@/types/domain";

export function DesktopAppearanceCardAdapter({
  post,
  customization,
  className,
}: {
  post: PostViewModel;
  customization: ProfileCustomizationView;
  className?: string;
}) {
  if (!post.appearance) return null;
  return (
    <ProfileAppearanceCardVisual
      profile={{
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.displayName,
        customization,
        status: post.appearance.status ?? {},
        badgeIds: post.appearance.badgeIds,
      }}
      scene={post.appearance.scene}
      variant="feed"
      className={className}
      avatar={
        <ProfileAvatar
          displayName={post.author.displayName}
          size="md"
          ring={customization.flags.hasAvatarRing}
          ringId={customization.avatarRingId}
          decorationUrl={customization.assets.avatarDecorationUrl}
          animatedAvatarUrl={customization.assets.animatedAvatarUrl ?? post.author.avatarUrl}
        />
      }
      badges={
        <ProfileBadgesView
          badgeIds={post.appearance.badgeIds ?? []}
          className="relative z-20 mt-2"
          compact
        />
      }
    />
  );
}
