import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Compact header shared by inner application panels. */
export function AppPanelHeader({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <header
      className={cn(
        "voople-panel-header relative shrink-0 px-4",
        className,
      )}
      style={style}
    >
      <div className="voople-panel-header__content flex h-full w-full min-w-0 items-center gap-3">
        {children}
      </div>
    </header>
  );
}
