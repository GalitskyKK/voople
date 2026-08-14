import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AccountChipVisual({
  displayName,
  username,
  avatar,
  compact = false,
  className,
}: {
  displayName: string;
  username: string;
  avatar: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center rounded-[var(--app-radius-lg)] border border-transparent transition-colors",
        compact ? "justify-center p-1" : "gap-2.5 px-2 py-2",
        "hover:border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]",
        className,
      )}
    >
      <span className="shrink-0">{avatar}</span>
      {!compact ? (
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
            {displayName}
          </span>
          <span className="block truncate text-xs text-[var(--app-muted)]">
            @{username}
          </span>
        </span>
      ) : null}
    </span>
  );
}
