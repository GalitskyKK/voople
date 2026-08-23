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
        "voople-sticky-section-stack sticky top-14 z-20 space-y-3 bg-[linear-gradient(to_bottom,var(--background)_0_88%,transparent)] pb-3 backdrop-blur-xl lg:top-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
