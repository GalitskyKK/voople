import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SectionHeaderGlow } from "./SectionHeaderGlow";

/** Компактная шапка внутренних панелей: списки, диалоги и боковые области. */
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
        "voople-panel-header relative min-h-16 shrink-0 overflow-hidden border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,transparent)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:py-3",
        className,
      )}
      style={style}
    >
      <SectionHeaderGlow />
      <div className="relative flex w-full items-center gap-3">{children}</div>
    </header>
  );
}
