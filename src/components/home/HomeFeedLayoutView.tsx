import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HomeFeedLayoutView({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "voople-feed-page grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)]",
        className,
      )}
    >
      <div className="min-w-0">{primary}</div>
      {secondary}
    </div>
  );
}
