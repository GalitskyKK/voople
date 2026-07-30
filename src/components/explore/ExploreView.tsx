import { Search } from "lucide-react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { COPY } from "@/lib/constants/copy";
import type {
  ExploreSearchResult,
  HashtagSearchHit,
} from "@/types/search";
import {
  ExploreSearchResults,
  type ExploreAvatarRenderer,
} from "./ExploreSearchResults";
import { TrendingHashtagsView } from "./TrendingHashtagsView";

type ExploreViewProps = {
  query: string;
  debouncedQuery: string;
  onQueryChange: (value: string) => void;
  result?: ExploreSearchResult;
  searching: boolean;
  searchError?: string | null;
  trending: HashtagSearchHit[];
  trendingLoading: boolean;
  trendingError?: string | null;
  renderDestination: NavigationDestinationRenderer;
  renderAvatar: ExploreAvatarRenderer;
  badgeUrl?: string;
};

export function ExploreView({
  query,
  debouncedQuery,
  onQueryChange,
  result,
  searching,
  searchError,
  trending,
  trendingLoading,
  trendingError,
  renderDestination,
  renderAvatar,
  badgeUrl,
}: ExploreViewProps) {
  const hasQuery = debouncedQuery.length >= 1;
  const isEmpty =
    hasQuery &&
    !searching &&
    result &&
    result.users.length === 0 &&
    result.hashtags.length === 0 &&
    result.posts.length === 0;

  return (
    <SectionFrame className="gap-5 py-4 lg:py-6">
      <SectionPageHeader title={COPY.search} />
      <div className="voople-user-search space-y-6 pb-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]" />
          <span className="sr-only">Поиск</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Люди, #хэштеги или текст поста"
            className="voople-input min-w-0 flex-1 py-2.5 pl-10 pr-3 text-sm"
          />
        </label>

        {!hasQuery && (
          <TrendingHashtagsView
            items={trending}
            loading={trendingLoading}
            error={trendingError}
            renderDestination={renderDestination}
          />
        )}
        {hasQuery && debouncedQuery.length < 2 && (
          <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
            Для поиска постов введите минимум 2 символа
          </p>
        )}
        {searching && hasQuery && (
          <div
            className="h-24 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
            aria-label="Выполняется поиск"
          />
        )}
        {searchError && (
          <p className="text-sm text-red-400" role="alert">
            {searchError}
          </p>
        )}
        {isEmpty && (
          <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
            Ничего не найдено
          </p>
        )}
        {result && hasQuery && !searching && (
          <ExploreSearchResults
            result={result}
            renderDestination={renderDestination}
            renderAvatar={renderAvatar}
            badgeUrl={badgeUrl}
          />
        )}
      </div>
    </SectionFrame>
  );
}
