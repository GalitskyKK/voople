"use client";

import { useEffect, useRef } from "react";

import type { FeedPageResult } from "@/server/services/feed.service";
import { trpc } from "@/lib/trpc/client";
import { useVirtualFeed } from "@/hooks/useVirtualFeed";
import { PostCard } from "./PostCard";

type HashtagFeedProps = {
  tag: string;
  viewerId?: string | null;
  initialPage?: FeedPageResult;
};

export function HashtagFeed({ tag, viewerId = null, initialPage }: HashtagFeedProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.feed.getHashtagPage.useInfiniteQuery(
      { tag, limit: 20 },
      {
        getNextPageParam: (last) => last.nextCursor,
        initialData: initialPage ? { pages: [initialPage], pageParams: [undefined] } : undefined,
        staleTime: 30_000,
      },
    );

  const posts = data?.pages.flatMap((page) => page.items) ?? [];
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

  if (error) {
    return (
      <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
        {error.message}
      </p>
    );
  }

  if (isLoading && posts.length === 0) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white/5" aria-hidden />;
  }

  if (posts.length === 0) {
    return (
      <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm text-white/50">
        Пока нет постов с этим хэштегом
      </p>
    );
  }

  return (
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
  );
}
