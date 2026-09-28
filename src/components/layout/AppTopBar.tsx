"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Download, LogIn, ShoppingBag } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { VoopleMark } from "@/components/brand/VoopleMark";
import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";
import { AppAccountMenu } from "./AppAccountMenu";

/** Mobile-only top bar; primary destinations live in bottom navigation. */
export function AppTopBar({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const hideShop = pathname.startsWith("/shop");

  return (
    <header data-nosnippet className="voople-topbar sticky top-0 z-20 flex h-12 items-center justify-between bg-[var(--material-chrome)] px-4 lg:hidden">
      <Link href={authenticated ? "/messages" : "/feed"} className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        <VoopleMark className="h-7 w-7" />
        <span className="voople-wordmark">{COPY.wordmark}</span>
      </Link>
      <div className="flex items-center gap-1">
        {authenticated ? (
          <>
            <Link
              href="/notifications"
              className="relative grid h-9 w-9 place-items-center rounded-[var(--app-radius-sm)] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
              aria-label={COPY.notifications}
            >
              <Bell className="h-5 w-5" strokeWidth={1.75} />
              <NotificationNavBadge className="right-0 top-0" />
            </Link>
            <AppAccountMenu compact fill={false} />
          </>
        ) : (
          <>
            {!hideShop ? (
              <Link
                href="/shop"
                className="flex items-center rounded-[var(--app-radius-sm)] px-2 py-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
                aria-label={COPY.shop}
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              </Link>
            ) : null}
            <Link
              href="/download/desktop"
              prefetch={false}
              className="flex items-center rounded-[var(--app-radius-sm)] px-2 py-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
              aria-label="Скачать приложение"
            >
              <Download className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-[var(--app-accent-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]"
            >
              <LogIn className="h-4 w-4" />
              Войти
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
