import { ProfileAppearanceCardVisual } from "@/components/profile/ProfileAppearanceCardVisual";
import type { PostViewModel, ProfileCustomizationView } from "@/types/domain";
import { DesktopProfileAvatar } from "../profile/DesktopProfileAvatar";

export function DesktopAppearanceCard({
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
        <DesktopProfileAvatar
          displayName={post.author.displayName}
          customization={customization}
          fallbackAvatarUrl={post.author.avatarUrl}
          size="md"
        />
      }
    />
  );
}
