import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionStickyHeaderStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "voople-sticky-section-stack sticky top-[var(--voople-sticky-offset)] z-30 space-y-3 pb-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
