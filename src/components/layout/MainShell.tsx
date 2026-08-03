"use client";

import { Suspense, useRef } from "react";
import { usePathname } from "next/navigation";

import { PlayerShell } from "@/components/player/PlayerShell";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { isMessagesThreadPath } from "@/lib/layout/messages-path";
import { cn } from "@/lib/utils";
import { AppShellFrame } from "./AppShellFrame";
import { AppTopBar } from "./AppTopBar";
import { BottomNav } from "./BottomNav";
import { CreatePostFab } from "./CreatePostFab";
import { DesktopSidebar } from "./DesktopSidebar";
import { FeedHeader } from "./FeedHeader";
import {
  ScrollContainerProvider,
  type ScrollContainerMode,
} from "./ScrollContainerContext";

const RESERVED_SLUGS = new Set([
  "feed",
  "messages",
  "notifications",
  "explore",
  "shop",
  "me",
  "post",
  "login",
  "register",
  "settings",
  "events",
]);

function isProfilePath(pathname: string) {
  const slug = pathname.slice(1);
  return /^\/[a-z0-9_]+$/i.test(pathname) && !RESERVED_SLUGS.has(slug);
}

function isMessagesPath(pathname: string) {
  return pathname.startsWith("/messages");
}

function useScrollMode(pathname: string): ScrollContainerMode {
  const isLg = useIsLgViewport();
  return isMessagesPath(pathname) || isLg ? "element" : "window";
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shellScrollRef = useRef<HTMLDivElement>(null);
  const isLg = useIsLgViewport();
  const scrollMode = useScrollMode(pathname);
  const usesWindowScroll = scrollMode === "window";
  const isProfileRoute = isProfilePath(pathname);
  const isMessagesRoute = isMessagesPath(pathname);
  const isShopRoute = pathname.startsWith("/shop");
  const isMobileMessagesThread =
    isMessagesRoute && !isLg && isMessagesThreadPath(pathname);
  const hideMobileTopBar = isMessagesRoute && !isLg;
  const hideMobileBottomNav = isMobileMessagesThread;
  const showFab =
    !pathname.startsWith("/messages") &&
    (pathname === "/feed" || pathname === "/me" || isProfileRoute);

  const contentMaxWidth = isMessagesRoute
    ? "max-w-none"
    : isShopRoute
      ? "max-w-[1440px]"
      : isProfileRoute
        ? "max-w-6xl"
        : "max-w-2xl";

  return (
    <AppShellFrame
      routeKind={
        isProfileRoute ? "profile" : isMessagesRoute ? "messages" : "standard"
      }
      sidebar={<DesktopSidebar />}
      overlay={<PlayerShell />}
      fixedViewport={isMessagesRoute}
      columnClassName={cn(isMessagesRoute && "h-full min-h-0")}
      workspaceClassName={cn(isMessagesRoute && "h-full min-h-0")}
      mainClassName={cn(
        contentMaxWidth,
        !usesWindowScroll && "min-h-0 flex-1",
        isMessagesRoute && "h-full min-h-0 overflow-hidden",
        !usesWindowScroll && "h-full min-h-0 overflow-hidden",
      )}
    >
      {!hideMobileTopBar && <AppTopBar />}
      <Suspense fallback={null}>
        <FeedHeader />
      </Suspense>
      <ScrollContainerProvider scrollRef={shellScrollRef} mode={scrollMode}>
        <div
          ref={shellScrollRef}
          data-voople-scroll={usesWindowScroll ? undefined : ""}
          className={cn(
            "voople-shell__scroll",
            !isProfileRoute && "lg:pb-6",
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
          <div
            id="main-content"
            className={cn(
              "voople-shell__page w-full",
              !isMessagesRoute && "px-4 lg:px-6",
              isMessagesRoute && "flex min-h-0 flex-1 flex-col px-0 py-0",
              isMobileMessagesThread && "px-0",
              isProfileRoute &&
                !usesWindowScroll &&
                "flex min-h-0 flex-1 flex-col lg:min-h-0 lg:py-0",
            )}
          >
            {children}
          </div>
        </div>
      </ScrollContainerProvider>
      {showFab && <CreatePostFab />}
      {!hideMobileBottomNav && <BottomNav />}
    </AppShellFrame>
  );
}
