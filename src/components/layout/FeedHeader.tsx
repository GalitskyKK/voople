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
    <header className="voople-feed-header sticky top-12 z-20 shrink-0 px-4 py-3 lg:static lg:top-auto lg:z-auto lg:px-6">
      <nav
        className="voople-feed-header__tabs mx-auto flex w-full max-w-2xl gap-1 rounded-2xl bg-[#1c1c1e] p-1"
        aria-label="Разделы ленты"
      >
        {FEED_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "voople-feed-header__tab min-w-0 flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/50 hover:text-white/75",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
