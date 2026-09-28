"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Download, LogIn, UserPlus } from "lucide-react";

import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";
import { AppSidebarVisual } from "./AppNavigationVisual";
import { AppAccountMenu } from "./AppAccountMenu";
import { MessengerSidebar } from "./MessengerSidebar";
import { useSidebarPreference } from "@/hooks/useSidebarPreference";
import { isMessagesThreadPath } from "@/lib/layout/messages-path";

export function DesktopSidebar({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebarPreference({
    forceExpanded: !authenticated,
  });
  // The messenger rail is the authenticated application's stable social
  // context. Keep it mounted while people inspect profiles, settings or
  // discovery so navigation never swaps back to the legacy icon rail.
  const messengerShell = authenticated;

  return (
    <AppSidebarVisual
      pathname={pathname}
      collapsed={messengerShell ? false : collapsed}
      onCollapsedChange={
        authenticated && !messengerShell ? setCollapsed : undefined
      }
      mode={authenticated ? "authenticated" : "public"}
      notificationBadge={authenticated ? <NotificationNavBadge /> : undefined}
      accountNavigation={
        authenticated ? (
          <AppAccountMenu compact={messengerShell ? false : collapsed} />
        ) : undefined
      }
      primaryNavigation={
        messengerShell ? (
          <MessengerSidebar
            pathname={pathname}
            renderDestination={({
              href,
              label,
              className,
              active,
              onNavigate,
              children,
            }) => (
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={className}
                onClick={() => onNavigate?.()}
              >
                {children}
              </Link>
            )}
          />
        ) : undefined
      }
      footerAfter={!authenticated ? (
        <div className="mt-2 space-y-1 border-t border-[var(--app-border)] pt-3">
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
          <Link
            href="/download/desktop"
            prefetch={false}
            className="flex items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-sm font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          >
            <Download className="h-5 w-5" /> Скачать приложение
          </Link>
        </div>
      ) : undefined}
      renderDestination={({ href, label, className, active, onNavigate, children }) => (
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={className}
          onClick={(event) => {
            if (href === "/messages" && isMessagesThreadPath(pathname)) {
              event.preventDefault();
              router.replace("/messages");
            }
            onNavigate?.();
          }}
        >
          {children}
        </Link>
      )}
    />
  );
}
