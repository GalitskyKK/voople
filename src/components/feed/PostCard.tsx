"use client";

import Link from "next/link";
import { MessageCircle, Repeat2 } from "lucide-react";
import { type CSSProperties, useState } from "react";

import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { PostViewModel } from "@/types/domain";
import { PostMedia } from "@/components/media/PostMedia";
import { PostAuthorRow } from "./PostAuthorRow";
import { PostComments } from "./PostComments";
import { PostLikeButton } from "./PostLikeButton";
import { PostViewCounter } from "./PostViewCounter";
import { StatusPostBody } from "./StatusPostBody";

type PostCardProps = {
  post: PostViewModel;
  className?: string;
  canLike?: boolean;
  viewerId?: string | null;
  profileUsername?: string;
  commentsAlwaysOpen?: boolean;
};

function RepostPreview({ post, depth = 0 }: { post: PostViewModel; depth?: number }) {
  const isStatus = post.kind === "status" && post.status;
  const hasNestedRepost = Boolean(post.repost?.target);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="mb-3">
        <p className="text-xs font-medium text-white/70">{post.author.displayName}</p>
        <p className="text-xs text-white/40">@{post.author.username}</p>
      </div>

      {post.repostComment && (
        <p className="mb-3 text-sm leading-relaxed text-white/90">{post.repostComment}</p>
      )}

      {post.text && <p className="text-sm leading-relaxed text-white/85">{post.text}</p>}
      {post.mediaUrl && (
        <PostMedia url={post.mediaUrl} mediaType={post.mediaType} className="mt-3" />
      )}
      {isStatus && <StatusPostBody status={post.status!} className={post.text ? "mt-3" : undefined} />}

      {hasNestedRepost && depth < 4 && (
        <div className="mt-3">
          <RepostPreview post={post.repost!.target} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

export function PostCard({
  post,
  className,
  canLike = false,
  viewerId = null,
  profileUsername,
  commentsAlwaysOpen = false,
}: PostCardProps) {
  const c = post.author.customization;
  const isStatus = post.kind === "status" && post.status;
  const chipHeader = Boolean(c?.flags.hasFeedCardStyle);
  const utils = trpc.useUtils();
  const [commentsOpen, setCommentsOpen] = useState(commentsAlwaysOpen);
  const [repostPanelOpen, setRepostPanelOpen] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [viewerReposted, setViewerReposted] = useState(post.repostedByViewer ?? false);
  const [repostPulseKey, setRepostPulseKey] = useState(0);

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

  return (
    <article className={cn("voople-post-card text-white", className)}>
      <div
        className="voople-post-card__surface overflow-hidden rounded-2xl bg-[#1c1c1e]"
        style={
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
          createdAt={post.createdAt}
          customization={c}
        />
        <div className={cn("voople-post-card__body px-4 pb-4", chipHeader ? "pt-3" : "pt-3")}>
          {post.repostComment && (
            <p className="voople-post-card__text mb-3 text-sm leading-relaxed text-white/90">
              {post.repostComment}
            </p>
          )}
          {post.text && (
            <p className="voople-post-card__text text-sm leading-relaxed text-white/90">{post.text}</p>
          )}
          {post.mediaUrl && (
            <PostMedia url={post.mediaUrl} mediaType={post.mediaType} className="mt-3" />
          )}
          {isStatus && (
            <StatusPostBody status={post.status!} className={post.text ? "mt-3" : undefined} />
          )}
          {post.repost?.target && (
            <div className="mt-3">
              <RepostPreview post={post.repost.target} />
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="voople-post-card__tags mt-2 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/hashtag/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          <footer className="voople-post-card__actions mt-4 flex items-center gap-5 border-t border-white/10 pt-3 text-white/60">
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
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (commentsAlwaysOpen) return;
                  setCommentsOpen((open) => !open);
                }}
                className={cn(
                  "inline-flex items-center hover:text-white",
                  (commentsOpen || commentsAlwaysOpen) && "text-white",
                )}
                aria-expanded={commentsOpen || commentsAlwaysOpen}
                aria-label={commentsAlwaysOpen ? "Комментарии" : "Показать комментарии"}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <Link
                href={`/post/${post.id}`}
                className="text-sm tabular-nums hover:text-white hover:underline"
              >
                {replyCount}
              </Link>
            </span>
            <button
              type="button"
              disabled={!viewerId || plainRepost.isPending || quoteRepost.isPending}
              onClick={() => setRepostPanelOpen((open) => !open)}
              className={cn(
                "inline-flex items-center gap-1.5 hover:text-white disabled:cursor-default disabled:opacity-50",
                viewerReposted && "text-white",
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
          </footer>
          {repostPanelOpen && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <textarea
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value)}
                maxLength={280}
                rows={3}
                placeholder="Добавить комментарий к репосту"
                className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#7B3AED]/60"
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
        </div>
      </div>
    </article>
  );
}
