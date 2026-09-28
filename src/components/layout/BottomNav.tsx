"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppBottomNavigationVisual } from "./AppNavigationVisual";

export function BottomNav({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  return (
    <AppBottomNavigationVisual
      pathname={pathname}
      mode={authenticated ? "authenticated" : "public"}
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
