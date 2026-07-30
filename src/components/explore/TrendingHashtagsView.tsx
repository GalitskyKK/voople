import { Hash } from "lucide-react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import type { HashtagSearchHit } from "@/types/search";

export function TrendingHashtagsView({
  items,
  loading,
  error,
  renderDestination,
}: {
  items: HashtagSearchHit[];
  loading: boolean;
  error?: string | null;
  renderDestination: NavigationDestinationRenderer;
}) {
  if (loading) {
    return (
      <div className="h-28 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />
    );
  }
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (items.length === 0) {
    return (
      <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
        Пока нет популярных хэштегов
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Трендовые хэштеги</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((hashtag) => (
          <li key={hashtag.name}>
            {renderDestination({
              href: `/hashtag/${encodeURIComponent(hashtag.name)}`,
              label: `Хэштег ${hashtag.name}`,
              active: false,
              className:
                "inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5 text-sm text-[color-mix(in_srgb,var(--foreground)_88%,transparent)] transition-all duration-200 hover:border-[var(--app-border-strong)] hover:bg-[color-mix(in_srgb,var(--app-surface-soft)_75%,white)]",
              children: (
                <>
                  <Hash className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                  <span>{hashtag.name}</span>
                  <span className="text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
                    {hashtag.postCount}
                  </span>
                </>
              ),
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
