import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import type { ProfileCustomizationView } from "@/types/domain";
import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/utils";

type PostAuthorRowProps = {
  username: string;
  displayName: string;
  createdAt: string;
  postId?: string;
  customization?: ProfileCustomizationView;
};

/** Author row in post: default header or themed feed chip (replaces name block, not above post). */
export function PostAuthorRow({
  username,
  displayName,
  createdAt,
  postId,
  customization,
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
          <Link href={`/${username}`} className="flex min-w-0 items-center gap-3">
            <ProfileAvatar
              displayName={displayName}
              size="sm"
              ring={c.flags.hasAvatarRing}
              decorationUrl={c.assets.avatarDecorationUrl}
              animatedAvatarUrl={c.assets.animatedAvatarUrl}
            />
            <p
              className={cn(
                "truncate text-sm font-semibold text-white",
                nameStyle.gradient &&
                  c.flags.hasDisplayNameStyle &&
                  "bg-clip-text text-transparent",
              )}
              style={c.flags.hasDisplayNameStyle ? nicknameStyle : undefined}
            >
              {displayName}
            </p>
          </Link>
          {timeNode}
        </div>
        <button
          type="button"
          className="relative z-10 shrink-0 text-white/50 hover:text-white"
          aria-label="Меню"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
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
        <Link href={`/${username}`} className="truncate text-sm font-medium text-white hover:underline">
          {displayName}
        </Link>
        {timeNode}
      </div>
      <button type="button" className="shrink-0 text-white/50 hover:text-white" aria-label="Меню">
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </header>
  );
}
