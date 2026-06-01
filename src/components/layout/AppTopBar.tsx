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
    <header className="voople-topbar sticky top-0 z-20 flex h-12 items-center justify-between border-b border-white/10 bg-[#0A0A0F]/95 px-4 backdrop-blur lg:hidden">
      <Link href="/feed" className="text-sm font-bold tracking-tight text-white">
        {COPY.appName}
      </Link>
      {!hideShop && (
        <Link
          href="/shop"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={COPY.shop}
        >
          <ShoppingBag className="h-5 w-5" />
        </Link>
      )}
    </header>
  );
}
