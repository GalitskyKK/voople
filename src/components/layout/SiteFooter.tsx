import { LegalLinks } from "./LegalLinks";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
  compact?: boolean;
};

export function SiteFooter({ className, compact = false }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-[var(--app-border)] text-[var(--app-muted)]",
        compact ? "py-6" : "py-8",
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <LegalLinks variant={compact ? "compact" : "footer"} />
      </div>
    </footer>
  );
}
