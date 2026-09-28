import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { SectionStickyHeaderStack } from "@/components/layout/SectionStickyHeaderStack";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BetaSearchPerson, BetaSearchResult } from "@/types/search";
import type { PublicGroupSearchHit } from "@/types/chat";
import { BetaSearchResults } from "./BetaSearchResults";

type ExploreViewProps = {
  query: string;
  debouncedQuery: string;
  onQueryChange: (value: string) => void;
  result?: BetaSearchResult;
  communities: PublicGroupSearchHit[];
  searching: boolean;
  searchError?: string | null;
  renderDestination: NavigationDestinationRenderer;
  renderAvatar: (person: BetaSearchPerson) => ReactNode;
  onNavigate: (href: string) => void;
};

export function ExploreView({
  query,
  debouncedQuery,
  onQueryChange,
  result,
  communities,
  searching,
  searchError,
  renderDestination,
  renderAvatar,
  onNavigate,
}: ExploreViewProps) {
  const [scope, setScope] = useState<"all" | "people" | "groups">("all");
  const hasQuery = debouncedQuery.length >= 1;
  const scopedResultCount = result
    ? scope === "people"
      ? result.people.length
      : scope === "groups"
          ? communities.length
          : result.people.length + communities.length
    : 0;
  const isEmpty = hasQuery && !searching && Boolean(result) && scopedResultCount === 0;

  return (
    <SectionFrame size="wide" className="py-3 lg:py-5">
      <SectionStickyHeaderStack className="space-y-2">
        <h1 className="sr-only">Поиск</h1>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]" />
          <span className="sr-only">Поиск людей и публичных групп</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Люди и публичные группы"
            className="voople-input min-h-11 w-full min-w-0 py-2.5 pl-10 pr-3 text-sm"
          />
        </label>

        <div className="voople-scroll flex gap-1 overflow-x-auto p-1" aria-label="Раздел поиска">
          {([ ["all", "Все"], ["people", "Люди"], ["groups", "Группы"] ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setScope(id)} aria-pressed={scope === id} className={scope === id ? "min-h-10 min-w-24 flex-1 rounded-[var(--material-control-radius)] bg-[var(--material-control-fill)] px-3 text-sm font-medium" : "min-h-10 min-w-24 flex-1 rounded-[var(--material-control-radius)] px-3 text-sm text-[var(--material-secondary-text)] hover:text-[var(--foreground)]"}>{label}</button>
          ))}
        </div>
      </SectionStickyHeaderStack>

      <div className="voople-user-search space-y-5 pb-4 pt-1">

        {!hasQuery ? <p className="text-sm text-[var(--app-muted)]">Найдите человека или публичную группу по имени.</p> : null}
        {hasQuery && debouncedQuery.length < 2 && (
          <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
            Для поиска групп введите минимум 2 символа
          </p>
        )}
        {searching && hasQuery && (
          <div className="space-y-2" aria-label="Выполняется поиск" aria-busy="true">
            <Skeleton shape="row" className="block h-16 w-full" />
            <Skeleton shape="row" className="block h-16 w-full" />
          </div>
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
          <BetaSearchResults
            people={result.people}
            groups={communities}
            scope={scope}
            renderDestination={renderDestination}
            renderAvatar={renderAvatar}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </SectionFrame>
  );
}
