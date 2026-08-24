"use client";

import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { InterestCatalogView } from "@/types/social";

export function InterestPickerView({ catalog, selected, limit, disabled, preferredCategorySlug, onToggle }: {
  catalog: InterestCatalogView;
  selected: ReadonlySet<string>;
  limit: number;
  disabled?: boolean;
  preferredCategorySlug?: string | null;
  onToggle: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const categorySlug = categoryOverride ?? preferredCategorySlug ?? "all";

  const interests = useMemo(
    () => catalog.categories.flatMap((category) => category.interests),
    [catalog.categories],
  );
  const selectedItems = interests.filter((interest) => selected.has(interest.slug));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleCategories = catalog.categories
    .filter((category) => categorySlug === "all" || category.slug === categorySlug)
    .map((category) => ({
      ...category,
      interests: category.interests.filter((interest) =>
        !normalizedQuery || interest.name.toLocaleLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((category) => category.interests.length > 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 60))}
          placeholder="Найти тему"
          className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] pl-9 pr-9 text-sm outline-none transition focus:border-[var(--theme-accent)]"
          aria-label="Поиск темы"
        />
        {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]" aria-label="Очистить поиск"><X className="h-4 w-4" /></button> : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Категории тем">
        <button type="button" role="tab" aria-selected={categorySlug === "all"} onClick={() => setCategoryOverride("all")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition", categorySlug === "all" ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]" : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]")}>Все темы</button>
        {catalog.categories.map((category) => <button key={category.slug} type="button" role="tab" aria-selected={categorySlug === category.slug} onClick={() => setCategoryOverride(category.slug)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition", categorySlug === category.slug ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]" : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]")}>{category.name}</button>)}
      </div>

      {selectedItems.length ? (
        <section aria-labelledby="selected-interests-title" className="rounded-xl bg-[var(--app-surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3"><h4 id="selected-interests-title" className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)]">Выбрано</h4><span className="text-xs tabular-nums text-[var(--app-muted)]">{selectedItems.length}/{limit}</span></div>
          <div className="mt-2 flex flex-wrap gap-2">{selectedItems.map((interest) => <button key={interest.slug} type="button" disabled={disabled} onClick={() => onToggle(interest.slug)} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs text-[var(--theme-accent)] disabled:opacity-50">{interest.name}<X className="h-3.5 w-3.5" /></button>)}</div>
        </section>
      ) : null}

      {visibleCategories.map((category) => (
        <section key={category.slug} aria-labelledby={`interest-category-${category.slug}`}>
          <h3 id={`interest-category-${category.slug}`} className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">{category.name}</h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {category.interests.map((interest) => {
              const active = selected.has(interest.slug);
              const unavailable = !active && selected.size >= limit;
              return (
                <button key={interest.slug} type="button" disabled={disabled || unavailable} aria-pressed={active} onClick={() => onToggle(interest.slug)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-40", active ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]" : "border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-soft)]")}>
                  {active ? <Check className="h-3.5 w-3.5" /> : null}{interest.name}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {!visibleCategories.length ? <div className="rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">По такой формулировке тем пока нет. Попробуйте более короткий запрос.</div> : null}
    </div>
  );
}
