import Link from "next/link";

import type { ProfileCustomizationView } from "@/types/domain";
import { PostMoreMenu } from "@/components/feed/PostMoreMenu";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { PostAuthorVisual } from "./PostAuthorVisual";

type PostAuthorRowProps = {
  username: string;
  displayName: string;
  hasVooplePlus?: boolean;
  createdAt: string;
  postId?: string;
  customization?: ProfileCustomizationView;
  postKind?: "text" | "status" | "appearance";
  postText?: string;
  repostComment?: string;
  hasRepostTarget?: boolean;
  viewerUsername?: string | null;
  profileUsername?: string;
  isPinned?: boolean;
  onTextUpdated?: (text: string, isRepostComment: boolean) => void;
  onDeleted?: () => void;
};

/** Author row in post: default header or themed feed chip (replaces name block, not above post). */
export function PostAuthorRow({
  username,
  displayName,
  hasVooplePlus,
  createdAt,
  postId,
  customization,
  postKind = "text",
  postText,
  repostComment,
  hasRepostTarget = false,
  viewerUsername = null,
  profileUsername,
  isPinned = false,
  onTextUpdated,
  onDeleted,
}: PostAuthorRowProps) {
  const c = customization;
  const renderDestination: NavigationDestinationRenderer = ({
    href,
    className,
    children,
  }) => (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
  const trailing = postId ? (
    <PostMoreMenu
      postId={postId}
      createdAt={createdAt}
      authorUsername={username}
      kind={postKind}
      text={postText}
      repostComment={repostComment}
      hasRepostTarget={hasRepostTarget}
      viewerUsername={viewerUsername}
      profileUsername={profileUsername}
      isPinned={isPinned}
      onTextUpdated={onTextUpdated}
      onDeleted={onDeleted}
    />
  ) : null;

  return (
    <PostAuthorVisual
      username={username}
      displayName={displayName}
      hasVooplePlus={hasVooplePlus}
      createdAt={createdAt}
      postId={postId}
      customization={c}
      renderDestination={renderDestination}
      trailing={trailing}
      avatar={
        <ProfileAvatar
          displayName={displayName}
          size="sm"
          ring={c?.flags.hasAvatarRing}
          ringId={c?.avatarRingId}
          decorationUrl={c?.assets.avatarDecorationUrl}
          animatedAvatarUrl={c?.assets.animatedAvatarUrl}
        />
      }
    />
  );
}
