import type { Session } from "@supabase/supabase-js";
import { Eye, Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import type { CSSProperties } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { PostMediaGallery } from "@/components/media/PostMediaGallery";
import {
  PostCardAction,
  PostCardActions,
} from "@/components/feed/PostCardVisual";
import { PostCardView } from "@/components/feed/PostCardView";
import { RepostPreviewVisual } from "@/components/feed/RepostPreviewVisual";
import { StatusPostBodyVisual } from "@/components/feed/StatusPostBodyVisual";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";

import type { DesktopConfig } from "../config";
import { DesktopAppearanceCard } from "../feed/DesktopAppearanceCard";
import { DesktopPostAuthor } from "../feed/DesktopPostAuthor";
import { DesktopPostMoreMenu } from "../feed/DesktopPostMoreMenu";
import type { DesktopPost } from "../feed/types";
import { useDesktopPostActions } from "../feed/useDesktopPostActions";

export function DesktopPostCardAdapter({
  post,
  config,
  session,
  renderDestination,
  ownerProfile,
}: {
  post: DesktopPost;
  config: DesktopConfig;
  session: Session;
  renderDestination: NavigationDestinationRenderer;
  ownerProfile?: { isPinned: boolean; onChanged: () => void };
}) {
  const customization = post.author.customization;
  const appearanceCustomization =
    post.appearance?.customization ?? customization;
  const actions = useDesktopPostActions(config, session, post);
  const badgeUrl = vooplusBadgeUrl(config.assetsCdnUrl);

  return (
    <PostCardView
      post={post}
      text={post.text}
      repostComment={post.repostComment}
      surfaceStyle={
        customization
          ? ({
              "--theme-accent": customization.themeAccent,
            } as CSSProperties)
          : undefined
      }
      author={<DesktopPostAuthor
        post={post}
        renderDestination={renderDestination}
        badgeUrl={badgeUrl}
        trailing={
          ownerProfile ? (
            <DesktopPostMoreMenu
              postId={post.id}
              isPinned={ownerProfile.isPinned}
              config={config}
              session={session}
              onChanged={ownerProfile.onChanged}
            />
          ) : undefined
        }
      />}
      appearance={post.kind === "appearance" &&
        post.appearance &&
        appearanceCustomization ? (
          <DesktopAppearanceCard
            post={post}
            customization={appearanceCustomization}
            className="mt-3"
          />
        ) : undefined}
      status={post.kind === "status" && post.status ? (
          <StatusPostBodyVisual
            status={post.status}
            className={post.text ? "mt-3" : undefined}
          />
        ) : undefined}
      repost={post.repost?.target ? (
          <div className="mt-3">
            <RepostPreviewVisual
              post={post.repost.target}
              badgeUrl={badgeUrl}
              renderMedia={(item) => (
                <PostMediaGallery post={item} className="mt-3" />
              )}
              renderAppearance={(item, nestedCustomization) => (
                <DesktopAppearanceCard
                  post={item}
                  customization={nestedCustomization}
                  className="mt-3"
                />
              )}
              renderStatus={(item, status) => (
                <StatusPostBodyVisual
                  status={status}
                  className={item.text ? "mt-3" : undefined}
                />
              )}
            />
          </div>
        ) : undefined}
      renderTag={(tag) => renderDestination({
        href: `/hashtag/${encodeURIComponent(tag)}`,
        label: `Хэштег ${tag}`,
        active: false,
        className:
          "rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 py-0.5 text-xs text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]",
        children: <>#{tag}</>,
      })}
      actions={<PostCardActions>
          <PostCardAction
            icon={<Eye />}
            label="Просмотры"
            value={post.viewCount}
          />
          <PostCardAction
            icon={<Heart />}
            label="Отметка «Нравится»"
            value={actions.likeCount}
            pressed={actions.liked}
            disabled={actions.pendingAction !== null}
            onClick={() => void actions.toggleLike()}
          />
          {renderDestination({
            href: `/post/${post.id}`,
            label: "Открыть комментарии",
            active: false,
            className:
              "voople-post-action inline-flex items-center gap-1.5 [&_svg]:h-4 [&_svg]:w-4",
            children: (
              <>
                <MessageCircle />
                <span className="text-sm tabular-nums">{post.replyCount}</span>
              </>
            ),
          })}
          <PostCardAction
            icon={<Repeat2 />}
            label="Репост"
            value={actions.repostCount}
            pressed={actions.reposted}
            disabled={actions.pendingAction !== null}
            onClick={() => void actions.toggleRepost()}
          />
          <PostCardAction
            icon={<Share2 />}
            label="Скопировать ссылку"
            onClick={() => void actions.share()}
          />
        </PostCardActions>}
      error={actions.error ? (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {actions.error}
          </p>
        ) : undefined}
    />
  );
}
