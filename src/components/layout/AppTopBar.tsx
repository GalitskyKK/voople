"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";

import { COPY } from "@/lib/constants/copy";

/** Mobile-only top bar; logo + shop. Desktop uses sidebar. */
export function AppTopBar() {
  const pathname = usePathname();
  const hideShop = pathname.startsWith("/shop");

  return (
    <header className="voople-topbar sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 backdrop-blur-md lg:hidden">
      <Link href="/feed" className="text-sm font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        {COPY.appName}
      </Link>
      {!hideShop && (
        <Link
          href="/shop"
          className="flex items-center gap-1.5 rounded-[var(--app-radius-sm)] px-2 py-1.5 text-sm text-[var(--app-muted)] transition-all duration-200 hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          aria-label={COPY.shop}
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      )}
    </header>
  );
}
