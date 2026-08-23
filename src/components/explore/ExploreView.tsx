import { Search } from "lucide-react";
import { useState } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { SectionStickyHeaderStack } from "@/components/layout/SectionStickyHeaderStack";
import { COPY } from "@/lib/constants/copy";
import type {
  ExploreSearchResult,
  ExploreHighlights,
  HashtagSearchHit,
} from "@/types/search";
import type { PublicGroupSearchHit } from "@/types/chat";
import {
  ExploreSearchResults,
  type ExploreAvatarRenderer,
} from "./ExploreSearchResults";
import { ExploreHighlightsView } from "./ExploreHighlightsView";

type ExploreViewProps = {
  query: string;
  debouncedQuery: string;
  onQueryChange: (value: string) => void;
  result?: ExploreSearchResult;
  communities: PublicGroupSearchHit[];
  searching: boolean;
  searchError?: string | null;
  trending: HashtagSearchHit[];
  trendingLoading: boolean;
  trendingError?: string | null;
  highlights?: ExploreHighlights;
  highlightsLoading?: boolean;
  highlightsError?: string | null;
  renderDestination: NavigationDestinationRenderer;
  renderAvatar: ExploreAvatarRenderer;
  badgeUrl?: string;
};

export function ExploreView({
  query,
  debouncedQuery,
  onQueryChange,
  result,
  communities,
  searching,
  searchError,
  trending,
  trendingLoading,
  trendingError,
  highlights,
  highlightsLoading = false,
  highlightsError,
  renderDestination,
  renderAvatar,
  badgeUrl,
}: ExploreViewProps) {
  const [scope, setScope] = useState<"all" | "people" | "posts" | "communities">("all");
  const hasQuery = debouncedQuery.length >= 1;
  const scopedResultCount = result
    ? scope === "people"
      ? result.users.length
      : scope === "posts"
        ? result.posts.length
        : scope === "communities"
          ? communities.length
          : result.users.length + result.hashtags.length + result.posts.length + communities.length
    : 0;
  const isEmpty = hasQuery && !searching && Boolean(result) && scopedResultCount === 0;

  return (
    <SectionFrame size="wide" className="py-4 lg:py-6">
      <SectionStickyHeaderStack>
        <SectionPageHeader title={COPY.search} density="compact" />
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

        <div className="voople-scroll flex gap-1 overflow-x-auto rounded-2xl bg-[var(--app-surface-soft)] p-1" aria-label="Раздел поиска">
          {([ ["all", "Все"], ["people", "Люди"], ["posts", "Посты"], ["communities", "Сообщества"] ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setScope(id)} aria-pressed={scope === id} className={scope === id ? "min-w-24 flex-1 rounded-xl bg-[var(--app-surface)] px-3 py-2 text-sm font-medium shadow-[var(--app-shadow-sm)]" : "min-w-24 flex-1 rounded-xl px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--foreground)]"}>{label}</button>
          ))}
        </div>
      </SectionStickyHeaderStack>

      <div className="voople-user-search space-y-6 pb-4 pt-2">

        {!hasQuery && (
          <section className="space-y-3" aria-labelledby="explore-highlights-title">
            <div><h2 id="explore-highlights-title" className="text-base font-semibold">Сейчас в Voople</h2><p className="mt-0.5 text-xs text-[var(--app-muted)]">Топ в каждой категории — без пустого стартового экрана</p></div>
            {highlightsLoading || trendingLoading ? <div className="h-64 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : highlightsError || trendingError ? <p className="text-sm text-red-400" role="alert">{highlightsError || trendingError}</p> : highlights ? (
              <ExploreHighlightsView highlights={highlights} trending={trending} scope={scope} renderDestination={renderDestination} renderAvatar={renderAvatar} badgeUrl={badgeUrl} />
            ) : null}
          </section>
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
            communities={communities}
            scope={scope}
            renderDestination={renderDestination}
            renderAvatar={renderAvatar}
            badgeUrl={badgeUrl}
          />
        )}
      </div>
    </SectionFrame>
  );
}
