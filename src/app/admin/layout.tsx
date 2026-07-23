import Link from "next/link";

import { requireAdminSession } from "@/lib/admin/require-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--app-border)] bg-[var(--app-surface-soft)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
              Voople Admin
            </p>
            <h1 className="text-lg font-semibold">Каталог ассетов</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm text-[color-mix(in_srgb,var(--foreground)_65%,transparent)]">
            <Link href="/admin/assets" className="hover:text-[var(--foreground)]">Ассеты</Link>
            <Link href="/admin/users" className="hover:text-[var(--foreground)]">Пользователи</Link>
            <Link href="/shop" className="hover:text-[var(--foreground)]">← В магазин</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
