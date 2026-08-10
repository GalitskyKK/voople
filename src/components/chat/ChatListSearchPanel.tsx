"use client";

import { ArrowLeft, Search } from "lucide-react";
import type { ReactNode } from "react";

import { AppPanelHeader } from "@/components/layout/AppPanelHeader";

import {
  ChatListFilters,
  type ChatListFilter,
  type ChatSearchScope,
} from "./ChatListFilters";

export function ChatListSearchPanel({
  query,
  searchActive,
  filter,
  searchScope,
  headerAction,
  onQueryChange,
  onSearchActiveChange,
  onFilterChange,
  onSearchScopeChange,
}: {
  query: string;
  searchActive: boolean;
  filter: ChatListFilter;
  searchScope: ChatSearchScope;
  headerAction?: ReactNode;
  onQueryChange: (value: string) => void;
  onSearchActiveChange: (value: boolean) => void;
  onFilterChange: (value: ChatListFilter) => void;
  onSearchScopeChange: (value: ChatSearchScope) => void;
}) {
  const closeSearch = () => {
    onQueryChange("");
    onSearchActiveChange(false);
    onSearchScopeChange("all");
  };

  return (
    <>
      <AppPanelHeader>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-[-0.025em]">Чаты</h1>
        {headerAction}
      </AppPanelHeader>
      <div className="shrink-0 space-y-2.5 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3">
        <div className="flex gap-2">
          {searchActive ? (
            <button type="button" onClick={closeSearch} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]" aria-label="Закрыть поиск">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                closeSearch();
                event.currentTarget.blur();
              }}
              onFocus={() => {
                onFilterChange("all");
                onSearchScopeChange("all");
                onSearchActiveChange(true);
              }}
              placeholder="Чаты, группы и контакты"
              aria-label="Найти чат, группу или контакт"
              className="voople-input h-10 w-full pl-9 text-sm"
            />
          </label>
        </div>
        <ChatListFilters searchActive={searchActive} filter={filter} searchScope={searchScope} onFilterChange={onFilterChange} onSearchScopeChange={onSearchScopeChange} />
      </div>
    </>
  );
}
