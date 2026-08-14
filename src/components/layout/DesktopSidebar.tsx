"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, LogIn, UserPlus } from "lucide-react";

import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";
import { GlobalPlayer } from "@/components/player/GlobalPlayer";
import { SidebarHighlights } from "./SidebarHighlights";
import { AppSidebarVisual } from "./AppNavigationVisual";
import { AppAccountChip } from "./AppAccountChip";

export function DesktopSidebar({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  return (
    <AppSidebarVisual
      pathname={pathname}
      mode={authenticated ? "authenticated" : "public"}
      notificationBadge={authenticated ? <NotificationNavBadge /> : undefined}
      navAfter={
        authenticated ? <>
          <SidebarHighlights />
          <GlobalPlayer variant="desktop" />
        </> : undefined
      }
      footerAfter={
        <div className="mt-2 space-y-1 border-t border-[var(--app-border)] pt-3">
          {authenticated ? <AppAccountChip /> : (
            <>
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname)}`}
                className="flex items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--app-surface-soft)]"
              >
                <LogIn className="h-5 w-5" /> Войти
              </Link>
              <Link
                href={`/register?redirect=${encodeURIComponent(pathname)}`}
                className="flex items-center gap-3 rounded-[var(--app-radius-lg)] bg-[var(--app-accent-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:brightness-110"
              >
                <UserPlus className="h-5 w-5" /> Создать профиль
              </Link>
            </>
          )}
          <Link
            href="/download/desktop"
            prefetch={false}
            className="flex items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-sm font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          >
            <Download className="h-5 w-5" /> Скачать приложение
          </Link>
        </div>
      }
      renderDestination={({ href, label, className, active, children }) => (
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={className}
        >
          {children}
        </Link>
      )}
    />
  );
}
