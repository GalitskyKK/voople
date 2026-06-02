import Link from "next/link";

import type { ProfileCustomizationView } from "@/types/domain";
import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { PostMoreMenu } from "@/components/feed/PostMoreMenu";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/utils";

type PostAuthorRowProps = {
  username: string;
  displayName: string;
  hasVooplePlus?: boolean;
  createdAt: string;
  postId?: string;
  customization?: ProfileCustomizationView;
  postKind?: "text" | "status";
  postText?: string;
  repostComment?: string;
  hasRepostTarget?: boolean;
  viewerUsername?: string | null;
  profileUsername?: string;
  onTextUpdated?: (text: string, isRepostComment: boolean) => void;
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
}: PostAuthorRowProps) {
  const c = customization;
  const useFeedChip = Boolean(c?.flags.hasFeedCardStyle);
  const timeNode = postId ? (
    <Link href={`/post/${postId}`} className="text-xs text-white/50 hover:text-white/70 hover:underline">
      <RelativeTime iso={createdAt} />
    </Link>
  ) : (
    <RelativeTime iso={createdAt} className="text-xs text-white/50" />
  );

  if (useFeedChip && c) {
    const nameStyle = c.displayName;
    const nicknameStyle = nameStyle.gradient
      ? { backgroundImage: `linear-gradient(90deg, ${nameStyle.color ?? "#e5e5e5"}, #fff)` }
      : { color: nameStyle.color ?? undefined };

    return (
      <header className="voople-post-card__author-chip relative flex items-center gap-3 overflow-hidden rounded-t-2xl px-3 py-2.5">
        <FeedAuthorChipBackdrop customization={c} />
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <Link href={`/${username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <ProfileAvatar
              displayName={displayName}
              size="sm"
              ring={c.flags.hasAvatarRing}
              decorationUrl={c.assets.avatarDecorationUrl}
              animatedAvatarUrl={c.assets.animatedAvatarUrl}
            />
            <DisplayNameWithPin
              hasVooplePlus={hasVooplePlus}
              size="sm"
              className="min-w-0"
              nameClassName={cn(
                "text-sm font-semibold",
                nameStyle.gradient && c.flags.hasDisplayNameStyle
                  ? "bg-clip-text text-transparent"
                  : "text-white",
              )}
              style={
                nameStyle.gradient && c.flags.hasDisplayNameStyle ? nicknameStyle : undefined
              }
            >
              {displayName}
            </DisplayNameWithPin>
          </Link>
          {timeNode}
        </div>
        {postId && (
          <PostMoreMenu
            className="relative z-10"
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
        decorationUrl={c?.assets.avatarDecorationUrl}
        animatedAvatarUrl={c?.assets.animatedAvatarUrl}
      />
      <div className="min-w-0 flex-1">
        <Link href={`/${username}`} className="block min-w-0 text-sm font-medium text-white hover:underline">
          <DisplayNameWithPin hasVooplePlus={hasVooplePlus} size="sm">
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
        />
      )}
    </header>
  );
}
