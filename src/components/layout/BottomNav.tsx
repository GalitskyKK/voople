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
      className="voople-bottom-nav pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-4 lg:hidden"
      aria-label="Основная навигация"
    >
      <ul className="pointer-events-auto flex h-14 items-center gap-1 rounded-full border border-white/10 bg-[#1c1c1e]/95 px-2 shadow-lg shadow-black/40 backdrop-blur-xl">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const isNotifications = href === "/notifications";
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-full px-2.5 py-2 text-[10px] transition-colors",
                  active ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80",
                )}
              >
                <span className="relative inline-flex">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {isNotifications && <NotificationNavBadge className="-right-0.5 -top-0.5" />}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
