import Link from "next/link";
import type { ReactNode } from "react";

import { COPY } from "@/lib/constants/copy";
import { LEGAL_UPDATED } from "@/lib/constants/legal";
import { SiteFooter } from "@/components/layout/SiteFooter";

type LegalDocumentProps = {
  title: string;
  children: ReactNode;
};

export function LegalDocument({ title, children }: LegalDocumentProps) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-[var(--app-border)] px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <Link
            href="/feed"
            className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)] transition-opacity hover:opacity-85"
          >
            {COPY.appName}
          </Link>
          <p className="text-xs text-[var(--app-muted)]">Обновлено: {LEGAL_UPDATED}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="voople-legal">
          <h1>{title}</h1>
          {children}
        </article>
      </main>

      <div className="mx-auto max-w-3xl px-4 pb-10">
        <SiteFooter compact />
      </div>
    </div>
  );
}
