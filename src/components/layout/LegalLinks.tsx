import Link from "next/link";

import { COPY } from "@/lib/constants/copy";
import { LEGAL_COMPACT_LINKS, LEGAL_PAGES } from "@/lib/constants/legal";
import { cn } from "@/lib/utils";

type LegalLinksProps = {
  variant?: "aside" | "footer" | "compact";
  className?: string;
};

export function LegalLinks({ variant = "footer", className }: LegalLinksProps) {
  const isAside = variant === "aside";
  const isCompact = variant === "compact";
  const links = isCompact ? LEGAL_COMPACT_LINKS : LEGAL_PAGES;
  const isMinimal = isAside || variant === "footer";

  return (
    <div className={cn("text-[var(--app-muted)]", className)}>
      <nav aria-label="Юридическая информация">
        <ul
          className={cn(
            isAside && "flex flex-col gap-3 text-[13px] leading-snug",
            isCompact && "flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]",
            !isAside && !isCompact && "flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm",
          )}
        >
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="transition-colors hover:text-[var(--foreground)] hover:underline hover:underline-offset-2"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {isMinimal && !isCompact && (
        <p
          className={cn(
            "font-medium text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]",
            isAside ? "mt-5 text-xs" : "mt-4 text-xs",
          )}
        >
          {COPY.appName}
        </p>
      )}
    </div>
  );
}
