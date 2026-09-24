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
  const communities = trpc.chat.publicGroups.useQuery(
    { q: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 10_000,
      retry: false,
    },
  );

  return (
    <ExploreView
      query={query}
      debouncedQuery={debouncedQuery}
      onQueryChange={setQuery}
      result={search.data}
      communities={communities.data ?? []}
      searching={search.isFetching}
      searchError={search.error?.message}
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
