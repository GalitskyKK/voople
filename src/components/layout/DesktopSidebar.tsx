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
      <div className="voople-sidebar__brand shrink-0 px-4 pb-6 pt-6">
        <Link href="/feed" className="text-lg font-bold tracking-tight text-white">
          {COPY.appName}
        </Link>
      </div>

      <nav
        className="voople-sidebar__nav voople-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3"
        aria-label="Основная навигация"
      >
        {MAIN_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const isNotifications = href === "/notifications";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "voople-sidebar__link flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/12 text-white"
                  : "text-white/50 hover:bg-white/6 hover:text-white/80",
              )}
            >
              <span className="relative inline-flex shrink-0">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {isNotifications && <NotificationNavBadge />}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="voople-sidebar__footer shrink-0 border-t border-white/10 px-3 pb-6 pt-4">
        {SIDEBAR_FOOTER_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-white/50 transition-colors hover:bg-white/6 hover:text-white/80"
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
