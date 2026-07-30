"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";
import { AppBottomNavigationVisual } from "./AppNavigationVisual";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <AppBottomNavigationVisual
      pathname={pathname}
      notificationBadge={
        <NotificationNavBadge className="-right-0.5 -top-0.5" />
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
