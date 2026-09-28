"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type GroupSurfaceTab = "chat" | "now" | "people";

const tabs = [
  ["now", "Войс"],
  ["chat", "Чат"],
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
    <div className="voople-group-surface-tabs flex min-h-10 shrink-0 items-stretch px-6">
      <div className="flex min-w-0 flex-1 items-stretch" role="tablist" aria-label="Раздел группы">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => onTabChange(id)}
            className={cn(
              "voople-group-surface-tabs__tab relative px-0 text-xs font-semibold tracking-[0.03em] transition-colors",
              activeTab === id ? "text-[var(--voople-ice)]" : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
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
