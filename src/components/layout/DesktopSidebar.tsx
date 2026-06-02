"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { COPY } from "@/lib/constants/copy";
import { MAIN_NAV_ITEMS, SIDEBAR_FOOTER_ITEMS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="voople-sidebar fixed left-0 top-0 hidden h-full w-[260px] shrink-0 flex-col lg:flex">
      <div className="voople-sidebar__brand shrink-0 px-5 pb-7 pt-7">
        <Link
          href="/feed"
          className="text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--foreground)] transition-opacity hover:opacity-85"
        >
          {COPY.appName}
        </Link>
      </div>

      <nav
        className="voople-sidebar__nav voople-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3"
        aria-label="Основная навигация"
      >
        {MAIN_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const isNotifications = href === "/notifications";
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "voople-sidebar__link relative flex items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--app-accent-soft)] text-[var(--foreground)]"
                  : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[color-mix(in_srgb,var(--foreground)_88%,transparent)]",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-[var(--theme-accent)]"
                />
              )}
              <span className="relative inline-flex shrink-0">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {isNotifications && <NotificationNavBadge />}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="voople-sidebar__footer shrink-0 border-t border-[var(--app-border)] px-3 pb-7 pt-5">
        {SIDEBAR_FOOTER_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-sm text-[var(--app-muted)] transition-all duration-200 hover:bg-[var(--app-surface-soft)] hover:text-[color-mix(in_srgb,var(--foreground)_88%,transparent)]"
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
