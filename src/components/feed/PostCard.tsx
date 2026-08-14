"use client";

import Link from "next/link";
import { MessageCircle, Repeat2 } from "lucide-react";
import { type CSSProperties, useState } from "react";

import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { PostViewModel } from "@/types/domain";
import { PostMedia } from "@/components/media/PostMedia";
import { PostMediaGallery } from "@/components/media/PostMediaGallery";
import { ProfileAppearanceCard } from "@/components/profile/ProfileAppearanceCard";
import { ProfileReactions } from "@/components/profile/ProfileReactions";
import { PostAuthorRow } from "./PostAuthorRow";
import { PostComments } from "./PostComments";
import { PostLikeButton } from "./PostLikeButton";
import { PostShareButton } from "./PostShareButton";
import { PostViewCounter } from "./PostViewCounter";
import { StatusPostBody } from "./StatusPostBody";
import {
  PostCardActions,
  PostCardBody,
  PostCardSurface,
} from "./PostCardVisual";
import { RepostContent } from "./RepostContent";
import { useAuthGate } from "@/components/auth/AuthGateProvider";

type PostCardProps = {
  post: PostViewModel;
  className?: string;
  canLike?: boolean;
  viewerId?: string | null;
  profileUsername?: string;
  commentsAlwaysOpen?: boolean;
  isPinned?: boolean;
};

export function PostCard({
  post,
  className,
  canLike = false,
  viewerId = null,
  profileUsername,
  commentsAlwaysOpen = false,
  isPinned = false,
}: PostCardProps) {
  const c = post.author.customization;
  const appearanceCustomization = post.appearance?.customization ?? c;
  const isStatus = post.kind === "status" && post.status;
  const utils = trpc.useUtils();
  const { requireAuth } = useAuthGate();
  const [commentsOpen, setCommentsOpen] = useState(commentsAlwaysOpen);
  const [repostPanelOpen, setRepostPanelOpen] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [viewerReposted, setViewerReposted] = useState(post.repostedByViewer ?? false);
  const [repostPulseKey, setRepostPulseKey] = useState(0);
  const [displayText, setDisplayText] = useState(post.text);
  const [displayRepostComment, setDisplayRepostComment] = useState(post.repostComment);
  const [deleted, setDeleted] = useState(false);

  const { data: viewer } = trpc.user.me.useQuery(undefined, {
    enabled: Boolean(viewerId),
    staleTime: 60_000,
    retry: false,
  });

  const plainRepost = trpc.post.repost.useMutation({
    onMutate: () => {
      setViewerReposted((reposted) => !reposted);
      setRepostCount((count) => (viewerReposted ? Math.max(0, count - 1) : count + 1));
      setRepostPulseKey((key) => key + 1);
    },
    onError: () => {
      setViewerReposted((reposted) => !reposted);
      setRepostCount((count) => (viewerReposted ? count + 1 : Math.max(0, count - 1)));
    },
    onSuccess: () => {
      setRepostPanelOpen(false);
      if (profileUsername) {
        void utils.profile.getPostsByUsername.invalidate({ username: profileUsername });
      }
    },
  });
  const quoteRepost = trpc.post.quoteRepost.useMutation({
    onMutate: () => {
      setRepostCount((count) => count + 1);
      setRepostPulseKey((key) => key + 1);
    },
    onError: () => {
      setRepostCount((count) => Math.max(0, count - 1));
    },
    onSuccess: () => {
      setQuoteText("");
      setRepostPanelOpen(false);
      void utils.feed.getPage.invalidate();
      if (profileUsername) {
        void utils.profile.getPostsByUsername.invalidate({ username: profileUsername });
      }
    },
  });

  if (deleted) return null;

  return (
    <PostCardSurface
      className={className}
      surfaceStyle={
          c
            ? ({
                "--theme-accent": c.themeAccent,
              } as CSSProperties)
            : undefined
      }
    >
        <PostAuthorRow
          postId={post.id}
          username={post.author.username}
          displayName={post.author.displayName}
          hasVooplePlus={post.author.hasVooplePlus}
          createdAt={post.createdAt}
          customization={c}
          postKind={post.kind}
          postText={displayText}
          repostComment={displayRepostComment}
          hasRepostTarget={Boolean(post.repost?.target)}
          viewerUsername={viewer?.username ?? null}
          profileUsername={profileUsername}
          isPinned={isPinned}
          onTextUpdated={(text, isRepostComment) => {
            if (isRepostComment) setDisplayRepostComment(text);
            else setDisplayText(text);
          }}
          onDeleted={() => setDeleted(true)}
        />
        <PostCardBody>
          {displayRepostComment && (
            <p className="voople-post-card__text mb-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
              {displayRepostComment}
            </p>
          )}
          {displayText && (
            <p className="voople-post-card__text text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">{displayText}</p>
          )}
          {post.media?.length ? (
            <PostMediaGallery post={post} className="mt-3" />
          ) : post.mediaUrl && (
            <PostMedia url={post.mediaUrl} mediaType={post.mediaType} className="mt-3" />
          )}
          {post.kind === "appearance" && post.appearance && appearanceCustomization ? (
            <div className="mt-3 w-full space-y-2.5">
              <ProfileAppearanceCard profile={{ id: post.author.id, username: post.author.username, displayName: post.author.displayName, customization: appearanceCustomization, status: post.appearance.status ?? {}, badgeIds: post.appearance.badgeIds }} scene={post.appearance.scene} variant="feed" />
              {post.author.id ? (
                <ProfileReactions
                  profileUserId={post.author.id}
                  canReact={Boolean(viewerId && viewerId !== post.author.id)}
                />
              ) : null}
            </div>
          ) : null}
          {isStatus && (
            <StatusPostBody
              status={post.status!}
              authorUsername={post.author.username}
              className={post.text ? "mt-3" : undefined}
            />
          )}
          <RepostContent post={post} />
          {post.tags && post.tags.length > 0 && (
            <div className="voople-post-card__tags mt-2 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/hashtag/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 py-0.5 text-xs text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          <PostCardActions>
            <PostViewCounter
              key={`${post.id}:${post.viewCount}`}
              postId={post.id}
              initialCount={post.viewCount}
              canTrack={Boolean(viewerId)}
            />
            <PostLikeButton
              postId={post.id}
              initialLiked={post.likedByViewer ?? false}
              initialCount={post.likeCount}
              canLike={canLike}
              profileUsername={profileUsername}
            />
            <span className="voople-post-action inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (commentsAlwaysOpen) return;
                  setCommentsOpen((open) => !open);
                }}
                className={cn(
                  "inline-flex items-center",
                  (commentsOpen || commentsAlwaysOpen) && "text-[var(--foreground)]",
                )}
                aria-expanded={commentsOpen || commentsAlwaysOpen}
                aria-label={commentsAlwaysOpen ? "Комментарии" : "Показать комментарии"}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <Link
                href={`/post/${post.id}`}
                className="text-sm tabular-nums hover:text-[var(--foreground)] hover:underline"
              >
                {replyCount}
              </Link>
            </span>
            <button
              type="button"
              disabled={plainRepost.isPending || quoteRepost.isPending}
              onClick={() => {
                if (!viewerId && !requireAuth({ title: "Сделать репост" })) return;
                setRepostPanelOpen((open) => !open);
              }}
              className={cn(
                "voople-post-action inline-flex items-center gap-1.5 disabled:opacity-50",
                viewerReposted && "text-[var(--foreground)]",
              )}
              aria-pressed={viewerReposted}
              aria-label="Репост"
            >
              <Repeat2
                key={`repost:${repostPulseKey}:${viewerReposted}`}
                className={cn("h-4 w-4", viewerReposted && "voople-action-pop")}
              />
              <span key={`repost-count:${repostCount}`} className="voople-count-bump text-sm tabular-nums">
                {repostCount}
              </span>
            </button>
            <PostShareButton
              postId={post.id}
              authorName={post.author.displayName}
              text={displayText || displayRepostComment}
            />
          </PostCardActions>
          {repostPanelOpen && (
            <div className="voople-panel--inset mt-3 p-3">
              <textarea
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value)}
                maxLength={280}
                rows={3}
                placeholder="Добавить комментарий к репосту"
                className="min-h-20 w-full resize-none voople-input"
              />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={plainRepost.isPending || quoteRepost.isPending}
                  onClick={() => plainRepost.mutate({ postId: post.id })}
                >
                  {viewerReposted ? "Убрать репост" : "Репост"}
                </Button>
                <Button
                  type="button"
                  disabled={!quoteText.trim() || plainRepost.isPending || quoteRepost.isPending}
                  onClick={() => quoteRepost.mutate({ postId: post.id, comment: quoteText.trim() })}
                >
                  Репост с комментарием
                </Button>
              </div>
            </div>
          )}
          <PostComments
            postId={post.id}
            open={commentsOpen || commentsAlwaysOpen}
            canComment={Boolean(viewerId)}
            onCountChange={setReplyCount}
          />
        </PostCardBody>
    </PostCardSurface>
  );
}
