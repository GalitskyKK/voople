"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PlayerShell } from "@/components/player/PlayerShell";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { isMessagesThreadPath } from "@/lib/layout/messages-path";
import {
  getAppRouteLayout,
  isAppMessagesPath,
  isAppProfilePath,
} from "@/lib/layout/route-layout";
import { cn } from "@/lib/utils";
import { registerInternalNavigationAdapter } from "@/lib/platform/internal-navigation";
import { AppShellFrame } from "./AppShellFrame";
import { AppPageContent } from "./AppPageContent";
import { AppTopBar } from "./AppTopBar";
import { BottomNav } from "./BottomNav";
import { CreatePostFab } from "./CreatePostFab";
import { DesktopSidebar } from "./DesktopSidebar";
import { FeedHeader } from "./FeedHeader";
import {
  ScrollContainerProvider,
  type ScrollContainerMode,
} from "./ScrollContainerContext";

function useScrollMode(pathname: string): ScrollContainerMode {
  const isLg = useIsLgViewport();
  return isAppMessagesPath(pathname) || isLg ? "element" : "window";
}

export function MainShell({
  children,
  authenticated,
}: {
  children: React.ReactNode;
  authenticated: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const shellScrollRef = useRef<HTMLDivElement>(null);
  const isLg = useIsLgViewport();
  const scrollMode = useScrollMode(pathname);
  const usesWindowScroll = scrollMode === "window";
  const routeLayout = getAppRouteLayout(pathname);
  const isProfileRoute = isAppProfilePath(pathname);
  const isMessagesRoute = isAppMessagesPath(pathname);
  const isMobileMessagesThread =
    isMessagesRoute && !isLg && isMessagesThreadPath(pathname);
  const hideMobileTopBar = isMessagesRoute && !isLg;
  const hideMobileBottomNav = isMobileMessagesThread;
  const showFab =
    !pathname.startsWith("/messages") &&
    (pathname === "/feed" || pathname === "/me" || isProfileRoute);

  useEffect(
    () => registerInternalNavigationAdapter((href) => router.push(href)),
    [router],
  );

  return (
    <AppShellFrame
      routeKind={routeLayout.routeKind}
      sidebar={<DesktopSidebar authenticated={authenticated} />}
      overlay={authenticated ? <PlayerShell /> : undefined}
      fixedViewport={isMessagesRoute}
      columnClassName={cn(isMessagesRoute && "h-full min-h-0")}
      workspaceClassName={cn(isMessagesRoute && "h-full min-h-0")}
      mainClassName={cn(
        routeLayout.contentClassName,
        !usesWindowScroll && "min-h-0 flex-1",
        isMessagesRoute && "h-full min-h-0 overflow-hidden",
        !usesWindowScroll && "h-full min-h-0 overflow-hidden",
      )}
    >
      {!hideMobileTopBar && <AppTopBar authenticated={authenticated} />}
      <Suspense fallback={null}>
        <FeedHeader />
      </Suspense>
      <ScrollContainerProvider scrollRef={shellScrollRef} mode={scrollMode}>
        <div
          ref={shellScrollRef}
          data-voople-scroll={usesWindowScroll ? undefined : ""}
          className={cn(
            "voople-shell__scroll",
            !isProfileRoute && !isMessagesRoute && "lg:pb-6",
            isMobileMessagesThread && "pb-0",
            !isLg && !isMobileMessagesThread && "pb-24",
            !isMessagesRoute &&
              "lg:voople-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
            !usesWindowScroll &&
              !isMessagesRoute &&
              "voople-scroll min-h-0 flex-1 overflow-y-auto",
            isMessagesRoute &&
              "flex min-h-0 flex-1 flex-col overflow-hidden",
            isProfileRoute &&
              !usesWindowScroll &&
              "lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden",
          )}
        >
          <AppPageContent
            id="main-content"
            padded={!isMessagesRoute}
            className={cn(
              isMessagesRoute && "flex min-h-0 flex-1 flex-col px-0 py-0",
              isMobileMessagesThread && "px-0",
              isProfileRoute &&
                !usesWindowScroll &&
                "flex min-h-0 flex-1 flex-col lg:min-h-0 lg:py-0",
            )}
          >
            {children}
          </AppPageContent>
        </div>
      </ScrollContainerProvider>
      {authenticated && showFab && <CreatePostFab />}
      {!hideMobileBottomNav && <BottomNav authenticated={authenticated} />}
    </AppShellFrame>
  );
}
