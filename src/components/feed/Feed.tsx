"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import type { FeedTabId } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";
import { useVirtualFeed } from "@/hooks/useVirtualFeed";
import type { FeedPageResult } from "@/server/services/feed.service";
import { CreatePostBlock } from "./CreatePostBlock";
import { PostCard } from "./PostCard";

type FeedProps = {
  canPost?: boolean;
  viewerId?: string | null;
  initialPage?: FeedPageResult;
  initialTab?: FeedTabId;
};

export function Feed({
  canPost = false,
  viewerId = null,
  initialPage,
  initialTab = "overview",
}: FeedProps) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as FeedTabId) || "overview";
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useRealtimeFeed(tab, viewerId);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.feed.getPage.useInfiniteQuery(
      { tab, limit: 20 },
      {
        getNextPageParam: (last) => last.nextCursor,
        initialData:
          initialPage && tab === initialTab
            ? { pages: [initialPage], pageParams: [undefined] }
            : undefined,
        staleTime: 30_000,
      },
    );

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const { parentRef, virtualizer, virtualItems, paddingTop, paddingBottom } = useVirtualFeed(posts.length);

  useEffect(() => {
    const el = loadMoreRef.current;
    const root = parentRef.current;
    if (!el || !root || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { root, rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, parentRef]);

  return (
    <div className="voople-feed flex min-h-0 flex-1 flex-col gap-4">
      {canPost && <CreatePostBlock canPost />}
      {isLoading && posts.length === 0 && (
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" aria-hidden />
      )}
      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {error.message}
        </p>
      )}
      {tab === "following" && !isLoading && posts.length === 0 && (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm text-white/50">
          Подпишитесь на кого-нибудь — здесь появятся их посты
        </p>
      )}
      {tab === "overview" && !isLoading && posts.length === 0 && (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm text-white/50">
          Лента пуста — создайте первый пост
        </p>
      )}

      {posts.length > 0 && (
        <div ref={parentRef} className="voople-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          <div style={{ paddingTop, paddingBottom }}>
            {virtualItems.map((virtualRow) => {
              const post = posts[virtualRow.index];
              if (!post) return null;
              return (
                <div
                  key={post.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="pb-4"
                >
                  <PostCard
                    post={post}
                    canLike={Boolean(viewerId)}
                    viewerId={viewerId}
                    profileUsername={post.author.username}
                  />
                </div>
              );
            })}
          </div>
          <div ref={loadMoreRef} className="h-2" aria-hidden />
          {isFetchingNextPage && (
            <div className="mt-2 h-12 animate-pulse rounded-2xl bg-white/5" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}
