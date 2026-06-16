"use client";

import { COPY } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";

export type ProfileFeedTab = "posts" | "media" | "questions";

type ProfileFeedTabsProps = {
  active: ProfileFeedTab;
  onChange: (tab: ProfileFeedTab) => void;
  className?: string;
};

const TABS: { id: ProfileFeedTab; label: string }[] = [
  { id: "posts", label: COPY.posts },
  { id: "media", label: COPY.media },
  { id: "questions", label: "Вопросы" },
];

/** Tabs above profile feed (posts vs media-only). Replies are comments on posts — no separate feed yet. */
export function ProfileFeedTabs({ active, onChange, className }: ProfileFeedTabsProps) {
  return (
    <nav
      className={cn(
        "voople-profile-feed-tabs flex gap-1 border-b border-white/10 text-sm",
        className,
      )}
      aria-label="Разделы ленты профиля"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2.5 font-medium transition-colors",
              isActive ? "text-white" : "text-white/50 hover:text-white/80",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-(--theme-accent)"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
