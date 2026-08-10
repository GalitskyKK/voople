import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AppPageContentProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

/** Shared route content geometry for the Next.js and Tauri shells. */
export const AppPageContent = forwardRef<HTMLDivElement, AppPageContentProps>(
  function AppPageContent(
    { padded = true, className, children, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          "voople-shell__page w-full",
          padded ? "px-4 lg:px-6" : "px-0",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
