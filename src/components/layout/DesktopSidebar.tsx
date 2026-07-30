"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationNavBadge } from "@/components/notifications/NotificationNavBadge";
import { GlobalPlayer } from "@/components/player/GlobalPlayer";
import { SidebarHighlights } from "./SidebarHighlights";
import { AppSidebarVisual } from "./AppNavigationVisual";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <AppSidebarVisual
      pathname={pathname}
      notificationBadge={<NotificationNavBadge />}
      navAfter={
        <>
          <SidebarHighlights />
          <GlobalPlayer variant="desktop" />
        </>
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
