"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type GroupSurfaceTab = "chat" | "now" | "people";

const tabs = [
  ["chat", "Чат"],
  ["now", "Сейчас"],
  ["people", "Люди"],
] as const;

export function GroupSurfaceTabs({
  activeTab,
  endAction,
  onTabChange,
}: {
  activeTab: GroupSurfaceTab;
  endAction?: ReactNode;
  onTabChange: (tab: GroupSurfaceTab) => void;
}) {
  return (
    <div className="voople-group-surface-tabs flex min-h-10 shrink-0 items-stretch border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3">
      <div className="flex min-w-0 flex-1 items-stretch gap-1" role="tablist" aria-label="Раздел группы">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => onTabChange(id)}
            className={cn(
              "voople-group-surface-tabs__tab relative min-w-16 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]",
              activeTab === id && "text-[var(--foreground)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {endAction ? <div className="flex shrink-0 items-center pl-2">{endAction}</div> : null}
    </div>
  );
}
