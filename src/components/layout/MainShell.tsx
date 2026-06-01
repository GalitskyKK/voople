"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { AppTopBar } from "./AppTopBar";
import { BottomNav } from "./BottomNav";
import { CreatePostFab } from "./CreatePostFab";
import { DesktopSidebar } from "./DesktopSidebar";
import { FeedHeader } from "./FeedHeader";

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reserved = new Set([
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
  const slug = pathname.slice(1);
  const isFeedRoute = pathname === "/feed" || pathname.startsWith("/hashtag/");
  const isProfileRoute = /^\/[a-z0-9_]+$/i.test(pathname) && !reserved.has(slug);
  const showFab =
    !pathname.startsWith("/messages") &&
    (pathname === "/feed" || pathname === "/me" || isProfileRoute);

  /** Лента — узкая колонка; профиль — две колонки (карточка + посты). */
  const contentMaxWidth = isProfileRoute ? "max-w-6xl" : "max-w-2xl";

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
            "voople-shell__main mx-auto flex w-full min-h-0 flex-1 flex-col",
            contentMaxWidth,
            isProfileRoute && "lg:h-full",
          )}
        >
          <AppTopBar />
          <Suspense fallback={null}>
            <FeedHeader />
          </Suspense>
          <div
            className={cn(
              "voople-shell__scroll voople-scroll min-h-0 flex-1 pb-24 lg:pb-6",
              isFeedRoute && "overflow-hidden",
              isProfileRoute && "overflow-y-auto lg:flex lg:flex-col lg:overflow-hidden",
              !isFeedRoute && !isProfileRoute && "overflow-y-auto",
            )}
          >
            <div
              className={cn(
                "voople-shell__page w-full px-4 lg:px-6",
                isFeedRoute && "h-full",
                isProfileRoute && "flex min-h-0 flex-1 flex-col lg:min-h-0 lg:py-0",
              )}
            >
              {children}
            </div>
          </div>
          {showFab && <CreatePostFab />}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
