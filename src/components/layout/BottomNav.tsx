"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MOBILE_NAV_ITEMS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="voople-bottom-nav pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Основная навигация"
    >
      <ul className="pointer-events-auto flex h-[3.625rem] items-center gap-0.5 rounded-full border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] px-2 shadow-[var(--app-shadow-nav)] backdrop-blur-xl">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const isNotifications = href === "/notifications";
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-full px-2.5 py-2 text-[10px] font-medium tracking-wide transition-all duration-200",
                  active
                    ? "text-[var(--foreground)]"
                    : "text-[var(--app-muted)] hover:text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]",
                )}
              >
                <span className="relative inline-flex">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {isNotifications && <NotificationNavBadge className="-right-0.5 -top-0.5" />}
                </span>
                <span>{label}</span>
                <span
                  aria-hidden
                  className="voople-nav-active-indicator"
                  data-active={active ? "true" : "false"}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
