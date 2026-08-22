"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InterestCatalogView } from "@/types/social";

export function InterestPickerView({ catalog, selected, limit, disabled, onToggle }: {
  catalog: InterestCatalogView;
  selected: ReadonlySet<string>;
  limit: number;
  disabled?: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="space-y-4">
      {catalog.categories.map((category) => (
        <section key={category.slug} aria-labelledby={`interest-category-${category.slug}`}>
          <h3 id={`interest-category-${category.slug}`} className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">{category.name}</h3>
          <div className="flex flex-wrap gap-2">
            {category.interests.map((interest) => {
              const active = selected.has(interest.slug);
              const unavailable = !active && selected.size >= limit;
              return (
                <button key={interest.slug} type="button" disabled={disabled || unavailable} aria-pressed={active} onClick={() => onToggle(interest.slug)} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-40", active ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]" : "border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-soft)]")}>
                  {active ? <Check className="h-3.5 w-3.5" /> : null}{interest.name}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
