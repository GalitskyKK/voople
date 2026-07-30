import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellFrameProps = {
  sidebar: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  routeKind?: "standard" | "profile" | "messages";
  fixedViewport?: boolean;
  columnClassName?: string;
  workspaceClassName?: string;
  mainClassName?: string;
};

/**
 * Shared application geometry for Next.js and Tauri.
 * Platform entry points own routing and data; this component owns the layout.
 */
export function AppShellFrame({
  sidebar,
  overlay,
  children,
  routeKind = "standard",
  fixedViewport = false,
  columnClassName,
  workspaceClassName,
  mainClassName,
}: AppShellFrameProps) {
  return (
    <div
      data-route-kind={routeKind}
      className={cn(
        "voople-shell min-h-screen bg-background",
        fixedViewport && "h-dvh min-h-0 overflow-hidden",
      )}
    >
      {sidebar}
      {overlay}
      <div
        className={cn(
          "voople-shell__column flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[var(--voople-sidebar-width)] lg:h-full lg:min-h-0 lg:p-2",
          fixedViewport && "h-full min-h-0",
          columnClassName,
        )}
      >
        <div
          className={cn(
            "voople-shell__workspace mx-auto flex w-full flex-1 justify-center gap-6 lg:h-full lg:min-h-0 lg:gap-8",
            fixedViewport && "h-full min-h-0",
            workspaceClassName,
          )}
        >
          <div
            className={cn(
              "voople-shell__main flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden",
              fixedViewport && "h-full min-h-0 overflow-hidden",
              mainClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
