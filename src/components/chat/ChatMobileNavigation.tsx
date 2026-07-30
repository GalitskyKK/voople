"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { MAIN_NAV_ITEMS } from "@/lib/constants/nav";
import { Sheet } from "@/components/ui/Sheet";

export function ChatMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] lg:hidden"
        aria-label="Открыть навигацию"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} placement="bottom">
        <h2 className="pr-10 text-lg font-semibold">Перейти</h2>
        <nav className="mt-4 grid grid-cols-2 gap-2" aria-label="Разделы Voople">
          {MAIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-3 text-sm font-medium transition hover:border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] hover:bg-[var(--app-accent-soft)]"
            >
              <Icon className="h-4 w-4 text-(--theme-accent)" />
              {label}
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
