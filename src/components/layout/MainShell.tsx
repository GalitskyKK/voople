"use client";

import { Suspense, useRef } from "react";
import { usePathname } from "next/navigation";

import { useDocumentScrollWheelForward } from "@/hooks/useDocumentScrollWheelForward";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { cn } from "@/lib/utils";
import { AppTopBar } from "./AppTopBar";
import { BottomNav } from "./BottomNav";
import { CreatePostFab } from "./CreatePostFab";
import { DesktopSidebar } from "./DesktopSidebar";
import { FeedHeader } from "./FeedHeader";
import { ScrollContainerProvider, type ScrollContainerMode } from "./ScrollContainerContext";

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
]);

function isProfilePath(pathname: string) {
  const slug = pathname.slice(1);
  return /^\/[a-z0-9_]+$/i.test(pathname) && !RESERVED_SLUGS.has(slug);
}

/**
 * Window scroll — нативный скролл документа (работает на Chrome mobile, Firefox и т.д.).
 * Element scroll — nested overflow внутри flex; ломает touch/wheel над контентом.
 * Nested нужен только профилю на desktop (две колонки, посты скроллятся отдельно).
 */
function useScrollMode(pathname: string): ScrollContainerMode {
  const isLg = useIsLgViewport();

  if (isLg && isProfilePath(pathname)) {
    return "element";
  }

  return "window";
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shellScrollRef = useRef<HTMLDivElement>(null);
  const scrollMode = useScrollMode(pathname);
  const usesWindowScroll = scrollMode === "window";
  const isProfileRoute = isProfilePath(pathname);
  const showFab =
    !pathname.startsWith("/messages") &&
    (pathname === "/feed" || pathname === "/me" || isProfileRoute);

  /** Лента — узкая колонка; профиль — две колонки (карточка + посты). */
  const contentMaxWidth = isProfileRoute ? "max-w-6xl" : "max-w-2xl";

  useDocumentScrollWheelForward(!usesWindowScroll);

  return (
    <div
      className={cn(
        "voople-shell min-h-screen bg-background",
        isProfileRoute && "lg:h-dvh lg:min-h-0 lg:overflow-hidden",
      )}
    >
      <DesktopSidebar />
      <div
        className={cn(
          "voople-shell__column flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[260px]",
          isProfileRoute && "lg:h-full lg:min-h-0",
        )}
      >
        <div
          className={cn(
            "voople-shell__main mx-auto flex w-full flex-col",
            contentMaxWidth,
            !usesWindowScroll && "min-h-0 flex-1",
            isProfileRoute && "lg:h-full",
          )}
        >
          <AppTopBar />
          <Suspense fallback={null}>
            <FeedHeader />
          </Suspense>
          <ScrollContainerProvider scrollRef={shellScrollRef} mode={scrollMode}>
            <div
              ref={shellScrollRef}
              data-voople-scroll={usesWindowScroll ? undefined : ""}
              className={cn(
                "voople-shell__scroll pb-24 lg:pb-6",
                !usesWindowScroll && "voople-scroll min-h-0 flex-1 overflow-y-auto",
                isProfileRoute && !usesWindowScroll && "lg:flex lg:flex-col lg:overflow-hidden",
              )}
            >
              <div
                id="main-content"
                className={cn(
                  "voople-shell__page w-full px-4 lg:px-6",
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
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
