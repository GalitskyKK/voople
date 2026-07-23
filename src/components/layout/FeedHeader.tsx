"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FEED_TABS, type FeedTabId } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";

export function FeedHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as FeedTabId) || "overview";

  if (pathname !== "/feed") return null;

  const setTab = (tab: FeedTabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/feed?${params.toString()}`, { scroll: false });
  };

  return (
    <header className="voople-feed-header sticky top-12 z-20 shrink-0 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-2.5 backdrop-blur-md lg:static lg:top-auto lg:px-6">
      <nav
        className="voople-feed-header__tabs mx-auto flex w-full max-w-2xl gap-1 rounded-[var(--app-radius-lg)] bg-[var(--app-surface-soft)] p-1"
        aria-label="Разделы ленты"
      >
        {FEED_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "voople-feed-header__tab min-w-0 flex-1 rounded-[var(--app-radius-md)] px-3 py-2.5 text-center text-sm font-medium transition-all duration-200",
              activeTab === id
                ? "bg-[var(--app-accent-soft)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
                : "text-[var(--app-muted)] hover:text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
