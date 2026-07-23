"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import type { PostViewModel } from "@/types/domain";

type PostLikeButtonProps = {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  canLike: boolean;
  profileUsername?: string;
};

function patchPosts(
  items: PostViewModel[],
  postId: string,
  liked: boolean,
  likeCount: number,
): PostViewModel[] {
  return items.map((p) =>
    p.id === postId ? { ...p, likedByViewer: liked, likeCount } : p,
  );
}

function patchFeedPages<T extends { pages: Array<{ items: PostViewModel[] }> } | undefined>(
  old: T,
  postId: string,
  liked: boolean,
  likeCount: number,
): T {
  return old
    ? ({
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: patchPosts(page.items, postId, liked, likeCount),
        })),
      } as T)
    : old;
}

export function PostLikeButton({
  postId,
  initialLiked,
  initialCount,
  canLike,
  profileUsername,
}: PostLikeButtonProps) {
  const [optimistic, setOptimistic] = useState<{
    postId: string;
    liked: boolean;
    count: number;
  } | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const utils = trpc.useUtils();
  const current =
    optimistic?.postId === postId
      ? optimistic
      : { postId, liked: initialLiked, count: initialCount };

  const likeMutation = trpc.post.like.useMutation({
    onMutate: async () => {
      const nextLiked = !current.liked;
      const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));
      setOptimistic({ postId, liked: nextLiked, count: nextCount });
      setPulseKey((key) => key + 1);

      await utils.feed.getPage.cancel();
      const prevFeedOverview = utils.feed.getPage.getInfiniteData({
        tab: "overview",
        limit: 20,
      });
      const prevFeedFollowing = utils.feed.getPage.getInfiniteData({
        tab: "following",
        limit: 20,
      });

      utils.feed.getPage.setInfiniteData({ tab: "overview", limit: 20 }, (old) =>
        patchFeedPages(old, postId, nextLiked, nextCount),
      );
      utils.feed.getPage.setInfiniteData({ tab: "following", limit: 20 }, (old) =>
        patchFeedPages(old, postId, nextLiked, nextCount),
      );

      let prevProfile: PostViewModel[] | undefined;
      if (profileUsername) {
        await utils.profile.getPostsByUsername.cancel({ username: profileUsername });
        prevProfile = utils.profile.getPostsByUsername.getData({
          username: profileUsername,
        });
        utils.profile.getPostsByUsername.setData({ username: profileUsername }, (old) =>
          old ? patchPosts(old, postId, nextLiked, nextCount) : old,
        );
      }

      return { prevFeedOverview, prevFeedFollowing, prevProfile, profileUsername };
    },
    onError: (_err, _vars, ctx) => {
      setOptimistic(null);
      if (ctx?.prevFeedOverview) {
        utils.feed.getPage.setInfiniteData(
          { tab: "overview", limit: 20 },
          ctx.prevFeedOverview,
        );
      }
      if (ctx?.prevFeedFollowing) {
        utils.feed.getPage.setInfiniteData(
          { tab: "following", limit: 20 },
          ctx.prevFeedFollowing,
        );
      }
      if (ctx?.profileUsername && ctx.prevProfile) {
        utils.profile.getPostsByUsername.setData(
          { username: ctx.profileUsername },
          ctx.prevProfile,
        );
      }
    },
    onSuccess: (data) => {
      setOptimistic({ postId, liked: data.liked, count: data.likeCount });

      utils.feed.getPage.setInfiniteData({ tab: "overview", limit: 20 }, (old) =>
        patchFeedPages(old, postId, data.liked, data.likeCount),
      );
      utils.feed.getPage.setInfiniteData({ tab: "following", limit: 20 }, (old) =>
        patchFeedPages(old, postId, data.liked, data.likeCount),
      );
      if (profileUsername) {
        utils.profile.getPostsByUsername.setData({ username: profileUsername }, (old) =>
          old ? patchPosts(old, postId, data.liked, data.likeCount) : old,
        );
      }
    },
  });

  if (!canLike) {
    return (
      <span className="voople-post-action inline-flex items-center gap-1.5 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
        <Heart className="h-4 w-4" />
        <span className="text-sm tabular-nums">{current.count}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={likeMutation.isPending}
      onClick={() => likeMutation.mutate({ postId })}
      className={cn(
        "voople-post-action inline-flex items-center gap-1.5 disabled:opacity-50",
        current.liked ? "text-[#f472b6]" : "text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]",
      )}
      aria-label={COPY.like}
      aria-pressed={current.liked}
    >
      <Heart
        key={`heart:${pulseKey}:${current.liked}`}
        className={cn("h-4 w-4", current.liked && "voople-action-pop fill-current")}
      />
      <span key={`likes:${current.count}`} className="voople-count-bump text-sm tabular-nums">
        {current.count}
      </span>
    </button>
  );
}
