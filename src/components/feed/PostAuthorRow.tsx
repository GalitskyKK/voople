import Link from "next/link";

import type { ProfileCustomizationView } from "@/types/domain";
import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { PostMoreMenu } from "@/components/feed/PostMoreMenu";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/utils";
import { displayNamePresentation } from "@/lib/customization/display-name-style";

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
  onTextUpdated,
  onDeleted,
}: PostAuthorRowProps) {
  const c = customization;
  const useFeedChip = Boolean(c?.flags.hasFeedCardStyle);
  const timeNode = postId ? (
    <Link href={`/post/${postId}`} className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] hover:underline">
      <RelativeTime iso={createdAt} />
    </Link>
  ) : (
    <RelativeTime iso={createdAt} className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
  );

  if (useFeedChip && c) {
    const nameStyle = c.displayName;
    const nickname = displayNamePresentation(nameStyle);

    return (
      <header className="voople-post-card__author-chip flex items-center gap-2 px-3 py-2.5">
        <div className="voople-author-nameplate relative h-14 min-w-0 flex-1 overflow-hidden rounded-xl">
          <FeedAuthorChipBackdrop backgroundUrl={c.assets.feedCardBackgroundUrl} />
          <Link href={`/${username}`} className="absolute inset-0 z-10 flex min-w-0 items-center">
            <span className="absolute left-10 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ProfileAvatar
              displayName={displayName}
              size="sm"
              ring={c.flags.hasAvatarRing}
              ringId={c.avatarRingId}
              decorationUrl={c.assets.avatarDecorationUrl}
              animatedAvatarUrl={c.assets.animatedAvatarUrl}
            />
            </span>
            <DisplayNameWithPin
              hasVooplePlus={hasVooplePlus}
              size="sm"
              className="ml-20 min-w-0 max-w-[calc(100%_-_6rem)]"
              nameClassName={cn(
                "text-sm font-semibold",
                c.flags.hasDisplayNameStyle ? nickname.className : "text-[var(--foreground)]",
              )}
              style={
                c.flags.hasDisplayNameStyle ? nickname.style : undefined
              }
            >
              {displayName}
            </DisplayNameWithPin>
          </Link>
        </div>
        <div className="ml-auto shrink-0">{timeNode}</div>
        {postId && (
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
            onTextUpdated={onTextUpdated}
            onDeleted={onDeleted}
          />
        )}
      </header>
    );
  }

  return (
    <header className="voople-post-card__header flex items-start gap-3 px-4 pt-4">
      <ProfileAvatar
        displayName={displayName}
        size="sm"
        ring={c?.flags.hasAvatarRing}
        ringId={c?.avatarRingId}
        decorationUrl={c?.assets.avatarDecorationUrl}
        animatedAvatarUrl={c?.assets.animatedAvatarUrl}
      />
      <div className="min-w-0 flex-1">
        <Link href={`/${username}`} className="block min-w-0 text-sm font-medium text-[var(--foreground)] hover:underline">
          <DisplayNameWithPin
            hasVooplePlus={hasVooplePlus}
            size="sm"
            nameClassName={c?.flags.hasDisplayNameStyle ? displayNamePresentation(c.displayName).className : undefined}
            style={c?.flags.hasDisplayNameStyle ? displayNamePresentation(c.displayName).style : undefined}
          >
            {displayName}
          </DisplayNameWithPin>
        </Link>
        {timeNode}
      </div>
      {postId && (
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
          onTextUpdated={onTextUpdated}
          onDeleted={onDeleted}
        />
      )}
    </header>
  );
}
