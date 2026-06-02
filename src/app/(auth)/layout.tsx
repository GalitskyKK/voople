import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { COPY } from "@/lib/constants/copy";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="main-content"
        className="relative flex flex-1 flex-col items-center justify-center px-4 py-12"
      >
        <div className="mb-8 max-w-sm text-center">
          <Link
            href="/feed"
            className="text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]"
          >
            {COPY.appName}
          </Link>
          <p className="mt-2 text-sm leading-relaxed text-[var(--app-muted)] text-balance">
            Социальная сеть с живыми профилями
          </p>
        </div>
        {children}
      </main>
      <div className="mx-auto w-full max-w-sm px-4 pb-8">
        <SiteFooter compact />
      </div>
    </div>
  );
}
