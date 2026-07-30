import type { Session } from "@supabase/supabase-js";
import { Eye, Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import { Fragment, type CSSProperties } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import {
  PostCardAction,
  PostCardActions,
  PostCardBody,
  PostCardSurface,
} from "@/components/feed/PostCardVisual";
import { RepostPreviewVisual } from "@/components/feed/RepostPreviewVisual";
import { StatusPostBodyVisual } from "@/components/feed/StatusPostBodyVisual";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";

import type { DesktopConfig } from "../config";
import { DesktopAppearanceCard } from "./DesktopAppearanceCard";
import { DesktopPostAuthor } from "./DesktopPostAuthor";
import { DesktopPostMedia } from "./DesktopPostMedia";
import type { DesktopPost } from "./types";
import { useDesktopPostActions } from "./useDesktopPostActions";

export function DesktopPostCard({
  post,
  config,
  session,
  renderDestination,
}: {
  post: DesktopPost;
  config: DesktopConfig;
  session: Session;
  renderDestination: NavigationDestinationRenderer;
}) {
  const customization = post.author.customization;
  const appearanceCustomization =
    post.appearance?.customization ?? customization;
  const actions = useDesktopPostActions(config, session, post);
  const badgeUrl = vooplusBadgeUrl(config.assetsCdnUrl);

  return (
    <PostCardSurface
      surfaceStyle={
        customization
          ? ({
              "--theme-accent": customization.themeAccent,
            } as CSSProperties)
          : undefined
      }
    >
      <DesktopPostAuthor
        post={post}
        renderDestination={renderDestination}
        badgeUrl={badgeUrl}
      />

      <PostCardBody>
        {post.repostComment ? (
          <p className="voople-post-card__text mb-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
            {post.repostComment}
          </p>
        ) : null}
        {post.text ? (
          <p className="voople-post-card__text text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
            {post.text}
          </p>
        ) : null}
        <DesktopPostMedia post={post} />

        {post.kind === "appearance" &&
        post.appearance &&
        appearanceCustomization ? (
          <DesktopAppearanceCard
            post={post}
            customization={appearanceCustomization}
            className="mt-3"
          />
        ) : null}
        {post.kind === "status" && post.status ? (
          <StatusPostBodyVisual
            status={post.status}
            className={post.text ? "mt-3" : undefined}
          />
        ) : null}
        {post.repost?.target ? (
          <div className="mt-3">
            <RepostPreviewVisual
              post={post.repost.target}
              badgeUrl={badgeUrl}
              renderMedia={(item) => (
                <DesktopPostMedia post={item} className="mt-3" />
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
        ) : null}

        {post.tags?.length ? (
          <div className="voople-post-card__tags mt-2 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Fragment key={tag}>
                {renderDestination({
                  href: `/hashtag/${encodeURIComponent(tag)}`,
                  label: `Хэштег ${tag}`,
                  active: false,
                  className:
                    "rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 py-0.5 text-xs text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]",
                  children: <>#{tag}</>,
                })}
              </Fragment>
            ))}
          </div>
        ) : null}

        <PostCardActions>
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
        </PostCardActions>
        {actions.error ? (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {actions.error}
          </p>
        ) : null}
      </PostCardBody>
    </PostCardSurface>
  );
}
