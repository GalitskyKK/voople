import type { ReactNode } from "react";

import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import type {
  PostViewModel,
  ProfileCustomizationView,
  StatusPostPayload,
} from "@/types/domain";

type RepostPreviewVisualProps = {
  post: PostViewModel;
  renderMedia: (post: PostViewModel) => ReactNode;
  renderAppearance?: (
    post: PostViewModel,
    customization: ProfileCustomizationView,
  ) => ReactNode;
  renderStatus?: (
    post: PostViewModel,
    status: StatusPostPayload,
  ) => ReactNode;
  badgeUrl?: string;
  depth?: number;
};

export function RepostPreviewVisual({
  post,
  renderMedia,
  renderAppearance,
  renderStatus,
  badgeUrl,
  depth = 0,
}: RepostPreviewVisualProps) {
  const appearanceCustomization =
    post.appearance?.customization ?? post.author.customization;

  return (
    <div className="voople-panel--inset p-3">
      <div className="mb-3">
        <DisplayNameWithPin
          hasVooplePlus={post.author.hasVooplePlus}
          badgeUrl={badgeUrl}
          size="xs"
          className="text-xs font-medium text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]"
        >
          {post.author.displayName}
        </DisplayNameWithPin>
        <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
          @{post.author.username}
        </p>
      </div>

      {post.repostComment ? (
        <p className="mb-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
          {post.repostComment}
        </p>
      ) : null}
      {post.text ? (
        <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_85%,transparent)]">
          {post.text}
        </p>
      ) : null}
      {post.media?.length || post.mediaUrl ? renderMedia(post) : null}
      {post.kind === "appearance" &&
      post.appearance &&
      appearanceCustomization &&
      renderAppearance
        ? renderAppearance(post, appearanceCustomization)
        : null}
      {post.kind === "status" && post.status && renderStatus
        ? renderStatus(post, post.status)
        : null}
      {post.repost?.target && depth < 4 ? (
        <div className="mt-3">
          <RepostPreviewVisual
            post={post.repost.target}
            renderMedia={renderMedia}
            renderAppearance={renderAppearance}
            renderStatus={renderStatus}
            badgeUrl={badgeUrl}
            depth={depth + 1}
          />
        </div>
      ) : null}
    </div>
  );
}
