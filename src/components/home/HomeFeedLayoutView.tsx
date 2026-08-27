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
    <div className="voople-feed-page-container min-w-0">
      <div
        className={cn(
          "voople-feed-page grid min-w-0 gap-5",
          className,
        )}
      >
        <div className="min-w-0">{primary}</div>
        {secondary}
      </div>
    </div>
  );
}
