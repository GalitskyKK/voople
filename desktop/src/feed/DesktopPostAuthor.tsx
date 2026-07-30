import type { ReactNode } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { PostAuthorVisual } from "@/components/feed/PostAuthorVisual";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { DEFAULT_RING, resolveRingStyle } from "@/lib/customization/rings";
import type { PostViewModel } from "@/types/domain";

export function DesktopPostAuthor({
  post,
  renderDestination,
  badgeUrl,
  trailing,
}: {
  post: PostViewModel;
  renderDestination: NavigationDestinationRenderer;
  badgeUrl: string;
  trailing?: ReactNode;
}) {
  const customization = post.author.customization;
  const avatarUrl =
    customization?.assets.animatedAvatarUrl ?? post.author.avatarUrl;
  const decorationUrl = customization?.assets.avatarDecorationUrl;
  const ringStyle = customization?.avatarRingId
    ? resolveRingStyle(customization.avatarRingId)
    : customization?.flags.hasAvatarRing
      ? DEFAULT_RING
      : undefined;

  return (
    <PostAuthorVisual
      username={post.author.username}
      displayName={post.author.displayName}
      hasVooplePlus={post.author.hasVooplePlus}
      createdAt={post.createdAt}
      postId={post.id}
      customization={customization}
      renderDestination={renderDestination}
      badgeUrl={badgeUrl}
      trailing={trailing}
      avatar={
        <ProfileAvatarVisual
          displayName={post.author.displayName}
          size="sm"
          ringClassName={ringStyle?.className}
          avatarImage={
            avatarUrl ? (
              <img
                className="h-full w-full object-cover"
                src={avatarUrl}
                alt=""
              />
            ) : undefined
          }
          decorationImage={
            decorationUrl ? (
              <img
                className="h-full w-full max-w-none object-contain object-center"
                src={decorationUrl}
                alt=""
              />
            ) : undefined
          }
        />
      }
    />
  );
}
