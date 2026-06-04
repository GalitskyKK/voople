"use client";

import { Suspense, useRef } from "react";
import { usePathname } from "next/navigation";

import { useDocumentScrollWheelForward } from "@/hooks/useDocumentScrollWheelForward";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { isMessagesThreadPath } from "@/lib/layout/messages-path";
import { cn } from "@/lib/utils";
import { AppTopBar } from "./AppTopBar";
import { BottomNav } from "./BottomNav";
import { CreatePostFab } from "./CreatePostFab";
import { DesktopSidebar } from "./DesktopSidebar";
import { FeedHeader } from "./FeedHeader";
import { LegalAside } from "./LegalAside";
// import { LegalMobileStrip } from "./LegalMobileStrip";
import { PlayerShell } from "@/components/player/PlayerShell";
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

function isMessagesPath(pathname: string) {
  return pathname.startsWith("/messages");
}

/**
 * Window scroll — нативный скролл документа (работает на Chrome mobile, Firefox и т.д.).
 * Element scroll — nested overflow внутри flex; ломает touch/wheel над контентом.
 * Nested: профиль на desktop; мессенджер — фиксированный chrome, скролл только списка/чата.
 */
function useScrollMode(pathname: string): ScrollContainerMode {
  const isLg = useIsLgViewport();

  if (isMessagesPath(pathname)) {
    return "element";
  }

  if (isLg && isProfilePath(pathname)) {
    return "element";
  }

  return "window";
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shellScrollRef = useRef<HTMLDivElement>(null);
  const isLg = useIsLgViewport();
  const scrollMode = useScrollMode(pathname);
  const usesWindowScroll = scrollMode === "window";
  const isProfileRoute = isProfilePath(pathname);
  const isMessagesRoute = isMessagesPath(pathname);
  const isMobileMessagesThread = isMessagesRoute && !isLg && isMessagesThreadPath(pathname);
  const hideMobileTopBar = isMessagesRoute && !isLg;
  const hideMobileBottomNav = isMobileMessagesThread;
  const showFab =
    !pathname.startsWith("/messages") &&
    (pathname === "/feed" || pathname === "/me" || isProfileRoute);

  const showLegalAside = !pathname.startsWith("/messages");

  /** Лента — узкая колонка; профиль — две колонки (карточка + посты). */
  const contentMaxWidth = isProfileRoute ? "max-w-6xl" : "max-w-2xl";

  useDocumentScrollWheelForward(!usesWindowScroll);

  return (
    <div
      className={cn(
        "voople-shell min-h-screen bg-background",
        isMessagesRoute && "h-dvh min-h-0 overflow-hidden",
        isProfileRoute && "lg:h-dvh lg:min-h-0 lg:overflow-hidden",
      )}
    >
      <DesktopSidebar />
      <PlayerShell />
      <div
        className={cn(
          "voople-shell__column flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[260px]",
          isMessagesRoute && "h-full min-h-0",
          isProfileRoute && "lg:h-full lg:min-h-0",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full flex-1 justify-center gap-6 lg:gap-8",
            isMessagesRoute && "min-h-0 h-full",
            isProfileRoute && "min-h-0 lg:h-full lg:min-h-0",
          )}
        >
          <div
            className={cn(
              "voople-shell__main flex min-w-0 flex-1 flex-col",
              contentMaxWidth,
              isMessagesRoute && "max-w-5xl",
              !usesWindowScroll && "min-h-0 flex-1",
              isMessagesRoute && "h-full min-h-0 overflow-hidden",
              isProfileRoute && !usesWindowScroll && "lg:h-full lg:min-h-0 lg:overflow-hidden",
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
                  "voople-shell__scroll lg:pb-6",
                  isMobileMessagesThread ? "pb-0" : "pb-24",
                  !usesWindowScroll &&
                    !isMessagesRoute &&
                    "voople-scroll min-h-0 flex-1 overflow-y-auto",
                  isMessagesRoute && "flex min-h-0 flex-1 flex-col overflow-hidden",
                  isProfileRoute && !usesWindowScroll && "lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden",
                )}
              >
                <div
                  id="main-content"
                  className={cn(
                    "voople-shell__page w-full px-4 lg:px-6",
                    isMessagesRoute && "flex min-h-0 flex-1 flex-col py-0",
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
          </div>
          {showLegalAside && <LegalAside />}
        </div>
        {/* Mobile legal strip — hidden for now; re-enable when placement is decided
        {showLegalAside && <LegalMobileStrip />}
        */}
      </div>
    </div>
  );
}
