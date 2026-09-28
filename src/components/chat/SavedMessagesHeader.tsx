"use client";

import { ArrowLeft, Bookmark, Search, X } from "lucide-react";

import { AppPanelHeader } from "@/components/layout/AppPanelHeader";

export function SavedMessagesHeader({
  query,
  onQueryChange,
  onBack,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onBack: () => void;
}) {
  return (
    <AppPanelHeader className="voople-chat-window__header">
      <button
        type="button"
        onClick={onBack}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--app-radius-md)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] lg:hidden"
        aria-label="Вернуться к чатам"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--app-radius-md)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
        <Bookmark className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
          Избранное
        </span>
        <span className="block text-[11px] text-[var(--app-muted)]">Только вы</span>
      </span>
      <label className="relative flex h-9 w-[min(15rem,42vw)] items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[var(--app-muted)]" aria-hidden="true" />
        <span className="sr-only">Поиск в избранном</span>
        <input
          type="search"
          value={query}
          maxLength={100}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Поиск"
          className="h-full w-full rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] pl-9 pr-8 text-xs text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--app-muted)] focus:border-[var(--theme-accent)]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-1.5 grid h-6 w-6 place-items-center rounded text-[var(--app-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Очистить поиск"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </label>
    </AppPanelHeader>
  );
}
