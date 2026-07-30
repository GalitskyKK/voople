import { COPY, FEED_TABS, type FeedTabId } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";

import { SectionPageHeader } from "./SectionPageHeader";

type FeedHeaderVisualProps = {
  activeTab: FeedTabId;
  onTabChange: (tab: FeedTabId) => void;
};

export function FeedHeaderVisual({
  activeTab,
  onTabChange,
}: FeedHeaderVisualProps) {
  return (
    <div
      data-nosnippet
      className="voople-feed-header shrink-0 px-4 pt-3 lg:px-6 lg:pt-4"
    >
      <SectionPageHeader
        title={COPY.feed}
        density="compact"
        action={
          <nav
            className="voople-feed-header__tabs flex min-w-48 gap-1 rounded-[var(--app-radius-lg)] bg-[var(--app-surface-soft)] p-1 sm:min-w-56"
            aria-label="Разделы ленты"
          >
            {FEED_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "voople-feed-header__tab min-w-0 flex-1 rounded-[var(--app-radius-md)] border-0 px-2.5 py-2 text-center text-sm font-medium transition-all duration-200",
                  activeTab === id
                    ? "bg-[var(--app-accent-soft)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
                    : "bg-transparent text-[var(--app-muted)] hover:text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        }
      />
    </div>
  );
}
