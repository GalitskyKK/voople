"use client";

import Link from "next/link";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useDebouncedSearchQuery } from "@/hooks/useDebouncedSearchQuery";
import { trpc } from "@/lib/trpc/client";
import { ExploreView } from "./ExploreView";

export function UserSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const { query, setQuery, debouncedQuery } = useDebouncedSearchQuery(300, initialQuery);
  const search = trpc.search.explore.useQuery(
    { q: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 1,
      staleTime: 10_000,
    },
  );
  const trending = trpc.search.trendingHashtags.useQuery(
    { limit: 10 },
    {
      enabled: debouncedQuery.length === 0,
      staleTime: 60_000,
    },
  );
  const communities = trpc.chat.publicGroups.useQuery(
    { q: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 10_000,
      retry: false,
    },
  );
  const highlights = trpc.search.highlights.useQuery(undefined, {
    enabled: debouncedQuery.length === 0,
    staleTime: 60_000,
  });

  return (
    <ExploreView
      query={query}
      debouncedQuery={debouncedQuery}
      onQueryChange={setQuery}
      result={search.data}
      communities={communities.data ?? []}
      searching={search.isFetching}
      searchError={search.error?.message}
      trending={trending.data ?? []}
      trendingLoading={trending.isLoading}
      trendingError={trending.error?.message}
      highlights={highlights.data}
      highlightsLoading={highlights.isLoading}
      highlightsError={highlights.error?.message}
      renderDestination={({ href, label, className, children }) => (
        <Link href={href} aria-label={label} className={className}>
          {children}
        </Link>
      )}
      renderAvatar={({ author }) => (
        <ProfileAvatar
          displayName={author.displayName}
          size="sm"
          animatedAvatarUrl={
            author.avatarUrl ??
            author.customization?.assets.animatedAvatarUrl
          }
          decorationUrl={author.customization?.assets.avatarDecorationUrl}
          ringId={author.customization?.avatarRingId}
        />
      )}
    />
  );
}
